import { Test, TestingModule } from '@nestjs/testing';
import { RidesService } from './rides.service';
import { PrismaService } from '../prisma/prisma.service';
import { FareService } from '../fare/fare.service';
import { GeographyService } from '../geography/geography.service';
import { PoolsService } from '../pools/pools.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RideStatus, PoolStatus, Role, VehicleStatus } from '@prisma/client';

describe('RidesService (Lifecycle & TeslaPay Settlement)', () => {
  let service: RidesService;
  let mockPrisma: any;

  // In-memory test objects
  let testPassenger: any;
  let testDriver: any;
  let testRide: any;
  let testPool: any;

  beforeEach(async () => {
    testPassenger = {
      id: 'passenger-nusrat',
      name: 'Nusrat',
      role: Role.PASSENGER,
      walletPoysha: 150000, // 1500 BDT
    };

    testDriver = {
      id: 'driver-jashim',
      name: 'Jashim',
      role: Role.DRIVER,
      walletPoysha: 50000, // 500 BDT
    };

    testPool = {
      id: 'pool-1',
      driverId: testDriver.id,
      driver: testDriver,
      vehicleId: 'vehicle-bullet',
      vehicle: { id: 'vehicle-bullet', name: 'Bullet', capacity: 3, status: VehicleStatus.ONLINE },
      status: PoolStatus.OPEN,
      totalSeats: 3,
      availableSeats: 2,
    };

    testRide = {
      id: 'ride-1',
      passengerId: testPassenger.id,
      passenger: testPassenger,
      pickupZone: 'Banani',
      destinationZone: 'Mohakhali',
      seatsRequested: 1,
      estimatedFarePoysha: 4830,
      finalFarePoysha: null,
      status: RideStatus.REQUESTED,
      poolId: testPool.id,
      pool: testPool,
    };

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === testPassenger.id) return Promise.resolve(testPassenger);
          if (where.id === testDriver.id) return Promise.resolve(testDriver);
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const user = where.id === testPassenger.id ? testPassenger : testDriver;
          if (data.walletPoysha?.decrement) {
            user.walletPoysha -= data.walletPoysha.decrement;
          }
          if (data.walletPoysha?.increment) {
            user.walletPoysha += data.walletPoysha.increment;
          }
          return Promise.resolve(user);
        }),
      },
      rideRequest: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === testRide.id) return Promise.resolve(testRide);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          testRide = { ...testRide, ...data, id: 'new-ride-id' };
          return Promise.resolve(testRide);
        }),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(testRide, data);
          return Promise.resolve(testRide);
        }),
        count: jest.fn().mockResolvedValue(0),
      },
      pool: {
        update: jest.fn().mockResolvedValue(testPool),
      },
      vehicle: {
        update: jest.fn().mockResolvedValue({ status: VehicleStatus.ONLINE }),
      },
      walletTransaction: {
        create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RidesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: FareService,
          useValue: {
            calculateFare: jest.fn().mockReturnValue({
              finalFarePoysha: 4830,
              poolDiscountPoysha: 2070,
            }),
          },
        },
        {
          provide: GeographyService,
          useValue: {
            checkCompatibility: jest.fn().mockReturnValue({ isCompatible: true }),
          },
        },
        {
          provide: PoolsService,
          useValue: {
            getActivePools: jest.fn().mockResolvedValue([testPool]),
            joinPoolAtomic: jest.fn().mockResolvedValue({ success: true }),
            leavePoolAtomic: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    service = module.get<RidesService>(RidesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Ride Lifecycle State Transitions', () => {
    it('should transition through full valid lifecycle: REQUESTED -> MATCHED -> DRIVER_ARRIVED -> STARTED -> COMPLETED', async () => {
      // 1. REQUESTED -> MATCHED
      testRide.status = RideStatus.REQUESTED;
      await service.updateStatus(testRide.id, { status: RideStatus.MATCHED });
      expect(testRide.status).toBe(RideStatus.MATCHED);

      // 2. MATCHED -> DRIVER_ARRIVED
      await service.updateStatus(testRide.id, {
        status: RideStatus.DRIVER_ARRIVED,
        driverId: testDriver.id,
      });
      expect(testRide.status).toBe(RideStatus.DRIVER_ARRIVED);

      // 3. DRIVER_ARRIVED -> STARTED
      await service.updateStatus(testRide.id, {
        status: RideStatus.STARTED,
        driverId: testDriver.id,
      });
      expect(testRide.status).toBe(RideStatus.STARTED);

      // 4. STARTED -> COMPLETED (Triggers TeslaPay Settlement)
      const initialPassengerWallet = testPassenger.walletPoysha;
      const initialDriverWallet = testDriver.walletPoysha;

      await service.updateStatus(testRide.id, {
        status: RideStatus.COMPLETED,
        driverId: testDriver.id,
      });
      expect(testRide.status).toBe(RideStatus.COMPLETED);

      // Verify TeslaPay deduction from Nusrat and credit to Jashim
      expect(testPassenger.walletPoysha).toBe(initialPassengerWallet - 4830);
      expect(testDriver.walletPoysha).toBe(initialDriverWallet + 4830);
    });

    it('should reject invalid state transition (e.g. REQUESTED directly to STARTED)', async () => {
      testRide.status = RideStatus.REQUESTED;

      await expect(
        service.updateStatus(testRide.id, { status: RideStatus.STARTED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid state transition (e.g. COMPLETED to any other status)', async () => {
      testRide.status = RideStatus.COMPLETED;

      await expect(
        service.updateStatus(testRide.id, { status: RideStatus.STARTED }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Cancellation Rules', () => {
    it('should allow cancellation while ride is in REQUESTED or MATCHED state', async () => {
      testRide.status = RideStatus.MATCHED;

      const cancelled = await service.cancelRide(testRide.id, {
        userId: testPassenger.id,
        reason: 'Change of plans',
      });

      expect(cancelled.status).toBe(RideStatus.CANCELLED);
    });

    it('should REJECT cancellation once ride is STARTED', async () => {
      testRide.status = RideStatus.STARTED;

      await expect(
        service.cancelRide(testRide.id, {
          userId: testPassenger.id,
          reason: 'Cannot cancel in middle of trip',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
