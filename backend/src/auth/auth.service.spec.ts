import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    jwt = {
      sign: jest.fn().mockReturnValue('mock_jwt_token_123'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if user exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: '1', phone: '+8801700000000' });

      await expect(
        service.register({
          name: 'Test',
          phone: '+8801700000000',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password and create new passenger user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) => ({
        id: 'new-user-1',
        ...data,
      }));

      const result = await service.register({
        name: 'New Rider',
        phone: '+8801799999999',
        password: 'secretPassword',
      });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.user.name).toBe('New Rider');
      expect(result.user.role).toBe(Role.PASSENGER);
      expect((result.user as any).passwordHash).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          identifier: 'unknown@user.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password incorrect', async () => {
      const hash = await bcrypt.hash('correctPassword', 10);
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        passwordHash: hash,
        role: Role.PASSENGER,
      });

      await expect(
        service.login({
          identifier: 'user-1',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user when credentials match', async () => {
      const hash = await bcrypt.hash('correctPassword', 10);
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        name: 'Nusrat',
        phone: '+8801811000002',
        passwordHash: hash,
        role: Role.PASSENGER,
      });

      const result = await service.login({
        identifier: '+8801811000002',
        password: 'correctPassword',
      });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.user.name).toBe('Nusrat');
      expect((result.user as any).passwordHash).toBeUndefined();
    });
  });
});
