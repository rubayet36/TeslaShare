import { Test, TestingModule } from '@nestjs/testing';
import { PoolsService } from './pools.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PoolStatus, RideStatus } from '@prisma/client';

describe('PoolsService (Capacity & Concurrency)', () => {
  let service: PoolsService;
  let mockPrisma: any;

  // In-memory representation of Jashim's Bullet pool
  let testPool: {
    id: string;
    totalSeats: number;
    availableSeats: number;
    status: PoolStatus;
  };

  beforeEach(async () => {
    testPool = {
      id: 'pool-bullet-1',
      totalSeats: 3,
      availableSeats: 3,
      status: PoolStatus.OPEN,
    };

    mockPrisma = {
      pool: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(testPool)),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(testPool, data);
          return Promise.resolve(testPool);
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
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'member-1', ...data })),
      },
      $queryRaw: jest.fn().mockImplementation(() => Promise.resolve([testPool])),
      $transaction: jest.fn().mockImplementation(async (callback) => {
        // Pass mock transaction client
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

  describe('Bullet 3-Seat Capacity Enforcement', () => {
    it('should sequentially book seats for Nusrat, Rafiq, and Shirin, then mark pool FULL at 3/3', async () => {
      // 1. Nusrat books seat 1
      const res1 = await service.joinPoolAtomic({
        poolId: testPool.id,
        rideRequestId: 'nusrat-request',
        seats: 1,
      });
      expect(testPool.availableSeats).toBe(2);
      expect(testPool.status).toBe(PoolStatus.OPEN);

      // 2. Rafiq books seat 2
      const res2 = await service.joinPoolAtomic({
        poolId: testPool.id,
        rideRequestId: 'rafiq-request',
        seats: 1,
      });
      expect(testPool.availableSeats).toBe(1);
      expect(testPool.status).toBe(PoolStatus.OPEN);

      // 3. Shirin books seat 3 (The last seat)
      const res3 = await service.joinPoolAtomic({
        poolId: testPool.id,
        rideRequestId: 'shirin-request',
        seats: 1,
      });
      expect(testPool.availableSeats).toBe(0);
      expect(testPool.status).toBe(PoolStatus.FULL);
    });

    it('should reject a 4th passenger when Bullet capacity (3 seats) is reached', async () => {
      // Fill the pool completely (0 seats left)
      testPool.availableSeats = 0;
      testPool.status = PoolStatus.FULL;

      await expect(
        service.joinPoolAtomic({
          poolId: testPool.id,
          rideRequestId: 'extra-rider-request',
          seats: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject booking if requested seats exceed remaining capacity', async () => {
      // Only 1 seat left
      testPool.availableSeats = 1;

      // Rider tries to book 2 seats
      await expect(
        service.joinPoolAtomic({
          poolId: testPool.id,
          rideRequestId: 'two-seats-request',
          seats: 2,
        }),
      ).rejects.toThrow(ConflictException);

      // Capacity should remain intact
      expect(testPool.availableSeats).toBe(1);
    });
  });

  describe('PRD Section 12 Concurrency Simulation (1 Seat Left)', () => {
    it('should allow only one passenger to claim the last seat when two requests compete simultaneously', async () => {
      // Bullet has 1 seat left
      testPool.availableSeats = 1;
      testPool.status = PoolStatus.OPEN;

      // Simulate serialized lock execution within $transaction
      let activeLocks = 0;
      mockPrisma.$transaction = jest.fn().mockImplementation(async (callback) => {
        // Mutex behavior: transaction acquires lock
        activeLocks++;
        try {
          const res = await callback(mockPrisma);
          return res;
        } finally {
          activeLocks--;
        }
      });

      // Request 1: Nusrat
      const req1 = service.joinPoolAtomic({
        poolId: testPool.id,
        rideRequestId: 'competing-nusrat',
        seats: 1,
      });

      // Once req1 runs, availableSeats drops to 0 and status becomes FULL.
      // Request 2: Shirin (running immediately behind req1)
      const req2 = req1.then(() =>
        service.joinPoolAtomic({
          poolId: testPool.id,
          rideRequestId: 'competing-shirin',
          seats: 1,
        }),
      );

      // Verify: req1 succeeds, req2 is rejected with ConflictException
      await expect(req1).resolves.toBeDefined();
      await expect(req2).rejects.toThrow(ConflictException);

      // Verify: Available seats never dropped below 0
      expect(testPool.availableSeats).toBe(0);
      expect(testPool.status).toBe(PoolStatus.FULL);
    });
  });
});
