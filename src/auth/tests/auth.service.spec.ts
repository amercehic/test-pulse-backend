import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@db/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../services/auth.service';

// Mock bcrypt methods
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let loggerSpy: jest.SpyInstance;

  // Updated mock Prisma service with both findFirst and findUnique for roles:
  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn().mockResolvedValue({ id: 1, name: 'Test Org' }),
    },
    role: {
      // For the register method (which uses findFirst)
      findFirst: jest.fn().mockResolvedValue({ id: 1, name: 'admin' }),
      // For the assignRole method (which uses findUnique)
      findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'admin' }),
    },
    userRole: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    // Simulate a transaction by just calling the callback with the same mock
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('jwt.token.here'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    // Spy on the logger to prevent console output during tests
    loggerSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerSpy.mockRestore();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully register a new user', async () => {
      const mockUser = { id: 1, email: registerDto.email };

      // Ensure no user exists initially
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.organization.create.mockResolvedValue({ id: 1, name: 'Test Org' });
      // For registration, the service uses findFirst to get the admin role
      prisma.role.findFirst.mockResolvedValue({ id: 2, name: 'admin' });
      prisma.userRole.create.mockResolvedValue({ userId: 1, roleId: 2 });

      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { name: 'admin' },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });

    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException if admin role is missing', async () => {
      // Ensure no existing user to avoid ConflictException
      prisma.user.findUnique.mockResolvedValue(null);
      // Simulate missing admin role
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user', async () => {
      const mockUser = {
        id: 1,
        email: loginDto.email,
        password: 'hashedPassword',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockImplementation(() =>
        Promise.resolve(true),
      );

      const result = await service.login(loginDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = {
        id: 1,
        email: loginDto.email,
        password: 'hashedPassword',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockImplementation(() =>
        Promise.resolve(false),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('assignRole', () => {
    const assignRoleDto = {
      userId: 1,
      roleId: 1,
    };

    it('should successfully assign a role to a user', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockRole = { id: 1, name: 'ADMIN' };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      // In assignRole, the service uses findUnique to fetch the role
      prisma.role.findUnique.mockResolvedValue(mockRole);
      prisma.userRole.findFirst.mockResolvedValue(null);
      prisma.userRole.create.mockResolvedValue({ userId: 1, roleId: 1 });

      const result = await service.assignRole(assignRoleDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: assignRoleDto.userId },
      });
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: assignRoleDto.roleId },
      });
      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: assignRoleDto.userId, roleId: assignRoleDto.roleId },
      });
      expect(result).toEqual({
        message: `Role ${mockRole.name} assigned to user ${mockUser.email}`,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.assignRole(assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if role not found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.assignRole(assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if user already has the role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      prisma.role.findUnique.mockResolvedValue({ id: 1 });
      prisma.userRole.findFirst.mockResolvedValue({ userId: 1, roleId: 1 });

      await expect(service.assignRole(assignRoleDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
