import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      include: {
        vehicle: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        vehicle: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    return user;
  }

  async getDemoCast() {
    return this.prisma.user.findMany({
      where: {
        name: { in: ['Jashim', 'Nusrat', 'Rafiq', 'Shirin'] },
      },
      include: {
        vehicle: true,
      },
    });
  }
}
