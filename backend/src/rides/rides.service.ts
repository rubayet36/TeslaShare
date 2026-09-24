import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FareService } from '../fare/fare.service';
import { GeographyService } from '../geography/geography.service';
import { PoolsService } from '../pools/pools.service';
import { CreateRideRequestDto } from './dto/create-ride.dto';
import { UpdateRideStatusDto } from './dto/update-ride-status.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { RideStatus, TransactionType, VehicleStatus, PoolStatus } from '@prisma/client';

@Injectable()
export class RidesService {
  // Defined state machine transitions
  private readonly VALID_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
    [RideStatus.REQUESTED]: [RideStatus.MATCHED, RideStatus.CANCELLED],
    [RideStatus.MATCHED]: [RideStatus.DRIVER_ARRIVED, RideStatus.CANCELLED],
    [RideStatus.DRIVER_ARRIVED]: [RideStatus.STARTED, RideStatus.CANCELLED],
    [RideStatus.STARTED]: [RideStatus.COMPLETED],
    [RideStatus.COMPLETED]: [],
    [RideStatus.CANCELLED]: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly fareService: FareService,
    private readonly geographyService: GeographyService,
    private readonly poolsService: PoolsService,
  ) {}

  /**
   * Creates a ride request and attempts instant pooling match with Jashim & Bullet
   */
  async createRideRequest(dto: CreateRideRequestDto) {
    const passenger = await this.prisma.user.findUnique({
      where: { id: dto.passengerId },
    });

    if (!passenger) {
      throw new NotFoundException(`Passenger with ID '${dto.passengerId}' not found.`);
    }

    const seatsRequested = dto.seatsRequested ?? 1;
    const isPooled = dto.isPooled ?? true;

    // 1. Calculate fare in integer Poysha
    const fareQuote = this.fareService.calculateFare(
      dto.pickupZone,
      dto.destinationZone,
      isPooled,
      seatsRequested,
    );

    // 2. Create RideRequest in database
    const rideRequest = await this.prisma.rideRequest.create({
      data: {
        passengerId: passenger.id,
        pickupZone: dto.pickupZone,
        destinationZone: dto.destinationZone,
        seatsRequested,
        estimatedFarePoysha: fareQuote.finalFarePoysha,
        poolDiscountPoysha: fareQuote.poolDiscountPoysha,
        status: RideStatus.REQUESTED,
      },
    });

    // 3. Auto-matching: Look for active pool in pickup zone (e.g. Banani)
    let matchedPoolResult: any = null;
    const activePools = await this.poolsService.getActivePools(dto.pickupZone);

    for (const pool of activePools) {
      if (pool.availableSeats >= seatsRequested) {
        // If pool already has passengers, check route overlap
        let isRouteFeasible = true;
        if (pool.members && pool.members.length > 0) {
          const firstMemberRequest = pool.members[0].rideRequest;
          const compatibility = this.geographyService.checkCompatibility(
            {
              pickup: firstMemberRequest.pickupZone,
              destination: firstMemberRequest.destinationZone,
            },
            {
              pickup: dto.pickupZone,
              destination: dto.destinationZone,
            },
          );
          isRouteFeasible = compatibility.isCompatible;
        }

        if (isRouteFeasible) {
          try {
            matchedPoolResult = await this.poolsService.joinPoolAtomic({
              poolId: pool.id,
              rideRequestId: rideRequest.id,
              seats: seatsRequested,
            });
            break; // Successfully matched!
          } catch {
            // If lock contention or filled, continue to next pool
            continue;
          }
        }
      }
    }

    // Return current state with pool information if matched
    return this.getRideById(rideRequest.id);
  }

  /**
   * Finite State Machine: Transition ride through lifecycle
   * REQUESTED -> MATCHED -> DRIVER_ARRIVED -> STARTED -> COMPLETED
   */
  async updateStatus(id: string, dto: UpdateRideStatusDto) {
    const ride = await this.prisma.rideRequest.findUnique({
      where: { id },
      include: {
        pool: {
          include: {
            driver: true,
            vehicle: true,
          },
        },
        passenger: true,
      },
    });

    if (!ride) {
      throw new NotFoundException(`Ride request with ID '${id}' not found.`);
    }

    // Validate state transition
    const allowedNextStatuses = this.VALID_TRANSITIONS[ride.status];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid state transition. Ride cannot transition from '${ride.status}' to '${dto.status}'. Allowed transitions: [${allowedNextStatuses.join(', ')}]`,
      );
    }

    // Authorization: Only the assigned driver can progress trip from MATCHED onwards
    const driverActionStatuses: RideStatus[] = [
      RideStatus.DRIVER_ARRIVED,
      RideStatus.STARTED,
      RideStatus.COMPLETED,
    ];
    if (driverActionStatuses.includes(dto.status)) {
      if (dto.driverId && ride.pool && ride.pool.driverId !== dto.driverId) {
        throw new ForbiddenException(
          'Unauthorized: Only the assigned Tesla driver can update this ride status.',
        );
      }
    }


    // Perform transition in transaction
    return this.prisma.$transaction(async (tx) => {
      const updatedRide = await tx.rideRequest.update({
        where: { id },
        data: {
          status: dto.status,
          finalFarePoysha: dto.status === RideStatus.COMPLETED ? ride.estimatedFarePoysha : null,
        },
      });

      // Update pool and vehicle status accordingly
      if (ride.poolId) {
        if (dto.status === RideStatus.STARTED) {
          await tx.pool.update({
            where: { id: ride.poolId },
            data: { status: PoolStatus.IN_PROGRESS },
          });
          if (ride.pool?.vehicleId) {
            await tx.vehicle.update({
              where: { id: ride.pool.vehicleId },
              data: { status: VehicleStatus.BUSY },
            });
          }
        }

        // When ride is COMPLETED: Settle TeslaPay wallet
        if (dto.status === RideStatus.COMPLETED) {
          const farePoysha = ride.estimatedFarePoysha;

          // 1. Deduct from passenger wallet
          await tx.user.update({
            where: { id: ride.passengerId },
            data: { walletPoysha: { decrement: farePoysha } },
          });

          await tx.walletTransaction.create({
            data: {
              userId: ride.passengerId,
              amountPoysha: -farePoysha,
              type: TransactionType.RIDE_PAYMENT,
              description: `TeslaPay payment for ride to ${ride.destinationZone}`,
              rideRequestId: ride.id,
            },
          });

          // 2. Credit to driver wallet
          if (ride.pool?.driverId) {
            await tx.user.update({
              where: { id: ride.pool.driverId },
              data: { walletPoysha: { increment: farePoysha } },
            });

            await tx.walletTransaction.create({
              data: {
                userId: ride.pool.driverId,
                amountPoysha: farePoysha,
                type: TransactionType.DRIVER_EARNING,
                description: `Fare earnings for passenger ${ride.passenger.name} (${ride.pickupZone} -> ${ride.destinationZone})`,
                rideRequestId: ride.id,
              },
            });
          }

          // Check if all pool members have completed
          const remainingRides = await tx.rideRequest.count({
            where: {
              poolId: ride.poolId,
              status: { notIn: [RideStatus.COMPLETED, RideStatus.CANCELLED] },
            },
          });

          if (remainingRides === 0) {
            await tx.pool.update({
              where: { id: ride.poolId },
              data: { status: PoolStatus.COMPLETED },
            });
            if (ride.pool?.vehicleId) {
              await tx.vehicle.update({
                where: { id: ride.pool.vehicleId },
                data: { status: VehicleStatus.ONLINE },
              });
            }
          }
        }
      }

      return updatedRide;
    });
  }

  /**
   * Cancel ride with seat restoration
   */
  async cancelRide(id: string, dto: CancelRideDto) {
    const ride = await this.prisma.rideRequest.findUnique({
      where: { id },
    });

    if (!ride) {
      throw new NotFoundException(`Ride request with ID '${id}' not found.`);
    }

    if (ride.status === RideStatus.STARTED) {
      throw new BadRequestException('Cannot cancel ride once trip has already started.');
    }

    if (ride.status === RideStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed ride.');
    }

    if (ride.status === RideStatus.CANCELLED) {
      return ride;
    }

    // Release seat if member of pool
    if (ride.poolId) {
      await this.poolsService.leavePoolAtomic(ride.poolId, ride.id);
    }

    return this.prisma.rideRequest.update({
      where: { id },
      data: {
        status: RideStatus.CANCELLED,
        cancellationReason: dto.reason ?? 'Cancelled by user',
      },
    });
  }

  /**
   * Query single ride with full details
   */
  async getRideById(id: string) {
    const ride = await this.prisma.rideRequest.findUnique({
      where: { id },
      include: {
        passenger: true,
        pool: {
          include: {
            driver: true,
            vehicle: true,
            members: {
              include: {
                rideRequest: {
                  include: {
                    passenger: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException(`Ride request with ID '${id}' not found.`);
    }

    return ride;
  }

  /**
   * Query user ride history
   */
  async getUserRides(userId: string) {
    return this.prisma.rideRequest.findMany({
      where: { passengerId: userId },
      include: {
        pool: {
          include: {
            driver: true,
            vehicle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Query unassigned / pending ride requests for driver dashboard
   */
  async getPendingRides() {
    return this.prisma.rideRequest.findMany({
      where: {
        status: RideStatus.REQUESTED,
        poolId: null,
      },
      include: {
        passenger: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Driver explicitly accepts a ride request into their active Tesla pool
   */
  async acceptRide(rideId: string, driverId: string) {
    const driverVehicle = await this.prisma.vehicle.findUnique({
      where: { driverId },
    });

    if (!driverVehicle) {
      throw new NotFoundException(`No vehicle registered for driver '${driverId}'.`);
    }

    let activePool = await this.prisma.pool.findFirst({
      where: {
        driverId,
        status: { in: [PoolStatus.OPEN, PoolStatus.IN_PROGRESS] },
      },
    });

    if (!activePool) {
      activePool = await this.prisma.pool.create({
        data: {
          driverId,
          vehicleId: driverVehicle.id,
          status: PoolStatus.OPEN,
          totalSeats: driverVehicle.capacity || 3,
          availableSeats: driverVehicle.capacity || 3,
          pickupZone: driverVehicle.currentZone || 'Banani',
          currentZone: driverVehicle.currentZone || 'Banani',
        },
      });
    }

    const ride = await this.prisma.rideRequest.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException(`Ride request '${rideId}' not found.`);
    }

    // Atomically join pool
    await this.poolsService.joinPoolAtomic({
      poolId: activePool.id,
      rideRequestId: ride.id,
      seats: ride.seatsRequested,
    });

    return this.getRideById(ride.id);
  }

  /**
   * Query driver ride history
   */
  async getDriverHistory(driverId: string) {
    return this.prisma.rideRequest.findMany({
      where: {
        pool: { driverId },
        status: { in: [RideStatus.COMPLETED, RideStatus.CANCELLED] },
      },
      include: {
        passenger: true,
        pool: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }
}
