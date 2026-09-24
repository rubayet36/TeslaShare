import { Test, TestingModule } from '@nestjs/testing';
import { PoolsService } from './pools.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { PoolStatus, RideStatus } from '@prisma/client';

describe('PRD Section 12 Concurrency & Bullet Capacity Stress Suite', () => {
  let service: PoolsService;
  let mockPrisma: any;

  // In-memory Bullet Pool State
  let bulletPool: {
    id: string;
    totalSeats: number;
    availableSeats: number;
    status: PoolStatus;
  };

  beforeEach(async () => {
    bulletPool = {
      id: 'pool-bullet-banani',
      totalSeats: 3,
      availableSeats: 3,
      status: PoolStatus.OPEN,
    };

    mockPrisma = {
      pool: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve({ ...bulletPool })),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(bulletPool, data);
          return Promise.resolve({ ...bulletPool });
        }),
      },
      rideRequest: {
        findUnique: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve({
            id: where.id,
            status: RideStatus.REQUESTED,
            estimatedFarePoysha: 4830,
          }),
        ),
        update: jest.fn().mockResolvedValue({ status: RideStatus.MATCHED }),
      },
      poolMember: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'member-id', ...data })),
      },
      $queryRaw: jest.fn().mockImplementation(() => Promise.resolve([{ ...bulletPool }])),
      $transaction: jest.fn().mockImplementation(async (callback) => {
        // Serialized transaction lock mock
        return callback(mockPrisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PoolsService>(PoolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('1. Bullet Capacity Integrity (3 Seats Maximum)', () => {
    it('should allow Nusrat, Rafiq, and Shirin to claim 1 seat each, making Bullet FULL', async () => {
      // 1. Nusrat claims seat 1
      await service.joinPoolAtomic({
        poolId: bulletPool.id,
        rideRequestId: 'nusrat-request-id',
        seats: 1,
      });
      expect(bulletPool.availableSeats).toBe(2);

      // 2. Rafiq claims seat 2
      await service.joinPoolAtomic({
        poolId: bulletPool.id,
        rideRequestId: 'rafiq-request-id',
        seats: 1,
      });
      expect(bulletPool.availableSeats).toBe(1);

      // 3. Shirin claims seat 3
      await service.joinPoolAtomic({
        poolId: bulletPool.id,
        rideRequestId: 'shirin-request-id',
        seats: 1,
      });
      expect(bulletPool.availableSeats).toBe(0);
      expect(bulletPool.status).toBe(PoolStatus.FULL);
    });

    it('should strictly reject any 4th passenger attempt when Bullet is FULL', async () => {
      bulletPool.availableSeats = 0;
      bulletPool.status = PoolStatus.FULL;

      await expect(
        service.joinPoolAtomic({
          poolId: bulletPool.id,
          rideRequestId: 'excess-passenger-request',
          seats: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. PRD Section 12 Parallel Concurrency Lock Test (1 Seat Left)', () => {
    it('should handle simultaneous bookings when 1 seat remains, granting 1 request and rejecting the second with 409 Conflict', async () => {
      // Bullet has exactly 1 seat left
      bulletPool.availableSeats = 1;
      bulletPool.status = PoolStatus.OPEN;

      // Mock transaction serialization queue
      let lockAcquired = false;
      mockPrisma.$transaction = jest.fn().mockImplementation(async (callback) => {
        while (lockAcquired) {
          // Wait for lock release
          await new Promise((r) => setTimeout(r, 5));
        }
        lockAcquired = true;
        try {
          return await callback(mockPrisma);
        } finally {
          lockAcquired = false;
        }
      });

      // Fire Nusrat and Shirin requests concurrently using Promise.allSettled
      const reqNusrat = service.joinPoolAtomic({
        poolId: bulletPool.id,
        rideRequestId: 'concurrent-nusrat',
        seats: 1,
      });

      const reqShirin = service.joinPoolAtomic({
        poolId: bulletPool.id,
        rideRequestId: 'concurrent-shirin',
        seats: 1,
      });

      const results = await Promise.allSettled([reqNusrat, reqShirin]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly 1 request MUST succeed and 1 MUST fail
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Verify rejection error is ConflictException
      const rejReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejReason).toBeInstanceOf(ConflictException);
      expect(
        rejReason.message.includes('capacity exceeded') ||
          rejReason.message.includes('not accepting passengers'),
      ).toBe(true);


      // Verify Bullet available seats is exactly 0 and status is FULL (no negative seat corruption)
      expect(bulletPool.availableSeats).toBe(0);
      expect(bulletPool.status).toBe(PoolStatus.FULL);
    });
  });
});
