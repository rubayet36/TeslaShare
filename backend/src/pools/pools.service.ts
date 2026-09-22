import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePoolDto } from './dto/create-pool.dto';
import { JoinPoolDto } from './dto/join-pool.dto';
import { PoolStatus, RideStatus } from '@prisma/client';

@Injectable()
export class PoolsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new pool for a driver and their vehicle (default Bullet capacity: 3)
   */
  async createPool(dto: CreatePoolDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID '${dto.vehicleId}' not found.`);
    }

    return this.prisma.pool.create({
      data: {
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        status: PoolStatus.OPEN,
        totalSeats: vehicle.capacity,
        availableSeats: vehicle.capacity,
        pickupZone: dto.pickupZone ?? 'Banani',
        currentZone: dto.pickupZone ?? 'Banani',
      },
      include: {
        driver: true,
        vehicle: true,
      },
    });
  }

  /**
   * Concurrency-Safe Atomic Seat Reservation
   * PRD Section 3 & 12: Prevents overbooking Bullet's 3-seat limit.
   * Nusrat and Shirin trying to book the last seat simultaneously is handled safely
   * via an interactive transaction with row-level locking.
   */
  async joinPoolAtomic(dto: JoinPoolDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the pool row in PostgreSQL to prevent race conditions
      // Using raw query with FOR UPDATE lock on the target pool
      const lockedPools = await tx.$queryRaw<Array<{
        id: string;
        availableSeats: number;
        totalSeats: number;
        status: PoolStatus;
      }>>`
        SELECT "id", "availableSeats", "totalSeats", "status"
        FROM "pools"
        WHERE "id" = ${dto.poolId}
        FOR UPDATE
      `;

      const pool = lockedPools[0];
      if (!pool) {
        throw new NotFoundException(`Pool with ID '${dto.poolId}' not found.`);
      }

      if (pool.status !== PoolStatus.OPEN) {
        throw new ConflictException(
          `Pool is not accepting passengers. Current status: ${pool.status}`,
        );
      }

      // 2. Strict capacity check: Bullet capacity cannot be exceeded
      if (pool.availableSeats < dto.seats) {
        throw new ConflictException(
          `Tesla Bullet capacity exceeded. Requested ${dto.seats} seat(s), but only ${pool.availableSeats} of ${pool.totalSeats} seat(s) remain.`,
        );
      }

      // 3. Verify the ride request exists and is in REQUESTED state
      const rideRequest = await tx.rideRequest.findUnique({
        where: { id: dto.rideRequestId },
      });

      if (!rideRequest) {
        throw new NotFoundException(`Ride request with ID '${dto.rideRequestId}' not found.`);
      }

      if (rideRequest.status !== RideStatus.REQUESTED) {
        throw new BadRequestException(
          `Ride request cannot join pool because its status is already '${rideRequest.status}'.`,
        );
      }

      // Check if already a member of this pool
      const existingMember = await tx.poolMember.findUnique({
        where: { rideRequestId: dto.rideRequestId },
      });

      if (existingMember) {
        throw new ConflictException('This ride request is already matched to a pool.');
      }

      // 4. Calculate new remaining seats
      const newAvailableSeats = pool.availableSeats - dto.seats;
      const newStatus = newAvailableSeats === 0 ? PoolStatus.FULL : PoolStatus.OPEN;

      // 5. Update pool availableSeats & status atomically
      await tx.pool.update({
        where: { id: dto.poolId },
        data: {
          availableSeats: newAvailableSeats,
          status: newStatus,
        },
      });

      // 6. Create pool member record
      const member = await tx.poolMember.create({
        data: {
          poolId: dto.poolId,
          rideRequestId: dto.rideRequestId,
          seats: dto.seats,
          individualFarePoysha: rideRequest.estimatedFarePoysha,
        },
      });

      // 7. Update RideRequest to MATCHED
      await tx.rideRequest.update({
        where: { id: dto.rideRequestId },
        data: {
          status: RideStatus.MATCHED,
          poolId: dto.poolId,
        },
      });

      // 8. Return updated pool with member list
      const updatedPool = await tx.pool.findUnique({
        where: { id: dto.poolId },
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
      });

      return {
        success: true,
        member,
        pool: updatedPool,
      };
    });
  }

  /**
   * Release seat if a ride is cancelled
   */
  async leavePoolAtomic(poolId: string, rideRequestId: string) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.poolMember.findUnique({
        where: { rideRequestId },
      });

      if (!member || member.poolId !== poolId) {
        return null;
      }

      // Delete membership
      await tx.poolMember.delete({
        where: { id: member.id },
      });

      // Restore seats and re-open pool if it was full
      const pool = await tx.pool.findUnique({ where: { id: poolId } });
      if (pool) {
        const restoredSeats = Math.min(pool.totalSeats, pool.availableSeats + member.seats);
        await tx.pool.update({
          where: { id: poolId },
          data: {
            availableSeats: restoredSeats,
            status: pool.status === PoolStatus.FULL ? PoolStatus.OPEN : pool.status,
          },
        });
      }

      return { success: true };
    });
  }

  /**
   * Query all pools
   */
  async getAllPools(status?: PoolStatus) {
    return this.prisma.pool.findMany({
      where: status ? { status } : undefined,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active pools in a pickup zone
   */
  async getActivePools(zone?: string) {
    return this.prisma.pool.findMany({
      where: {
        status: PoolStatus.OPEN,
        availableSeats: { gt: 0 },
        pickupZone: zone ? { equals: zone, mode: 'insensitive' } : undefined,
      },
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
      orderBy: { availableSeats: 'asc' }, // Prioritize filling existing open pools
    });
  }

  /**
   * Query a single pool by ID
   */
  async getPoolById(id: string) {
    const pool = await this.prisma.pool.findUnique({
      where: { id },
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
    });

    if (!pool) {
      throw new NotFoundException(`Pool with ID '${id}' not found.`);
    }

    return pool;
  }
}
