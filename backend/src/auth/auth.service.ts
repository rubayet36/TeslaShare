import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role, TransactionType, VehicleStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('User with this phone or email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userRole = dto.role || Role.PASSENGER;
    const initialWalletPoysha = userRole === Role.DRIVER ? 50000 : 100000;

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email || null,
        passwordHash,
        role: userRole,
        walletPoysha: initialWalletPoysha,
        transactions: {
          create: [
            {
              amountPoysha: initialWalletPoysha,
              type: TransactionType.TOPUP,
              description: `${userRole === Role.DRIVER ? 'Driver' : 'TeslaPay'} initial wallet balance`,
            },
          ],
        },
        ...(userRole === Role.DRIVER
          ? {
              vehicle: {
                create: {
                  name: dto.vehicleName || 'Tesla Bullet',
                  model: dto.vehicleModel || 'Electric Tesla 3-Wheeler',
                  licensePlate: dto.licensePlate || `DHAKA-METRO-${Date.now().toString().slice(-4)}`,
                  capacity: 3,
                  status: VehicleStatus.ONLINE,
                  currentZone: 'Banani',
                },
              },
            }
          : {}),
      },
      include: {
        vehicle: true,
      },
    });

    // Auto-create initial open pool for the registered driver
    if (user.role === Role.DRIVER && user.vehicle) {
      await this.prisma.pool.create({
        data: {
          driverId: user.id,
          vehicleId: user.vehicle.id,
          status: PoolStatus.OPEN,
          totalSeats: user.vehicle.capacity || 3,
          availableSeats: user.vehicle.capacity || 3,
          pickupZone: user.vehicle.currentZone || 'Banani',
          currentZone: user.vehicle.currentZone || 'Banani',
        },
      });
    }

    const token = this.generateToken(user);
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      message: 'Registration successful',
      accessToken: token,
      user: userWithoutPassword,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { phone: dto.identifier },
        ],
      },
      include: {
        vehicle: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      message: 'Login successful',
      accessToken: token,
      user: userWithoutPassword,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vehicle: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private generateToken(user: { id: string; email?: string | null; phone: string; role: Role }) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
