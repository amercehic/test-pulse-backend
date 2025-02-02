import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@/auth/services/auth.service';
import { PrismaService } from '@db/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { LoginUserDto } from '@/auth/dto/login-user.dto';
import { AssignRoleDto } from '@/roles/dto/assign-role.dto';
import { randomUUID } from 'crypto';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    userRole: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(
      (callback: (tx: any) => Promise<any>): Promise<any> =>
        callback(mockPrismaService),
    ),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('jwt.token.here') as jest.MockedFunction<
      () => string
    >,
  };

  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    loggerSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerSpy.mockRestore();
  });

  describe('register', () => {
    const registerDto: RegisterUserDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully register a new user', async () => {
      const mockUser = { id: randomUUID(), email: registerDto.email };
      const mockOrganization = { id: randomUUID(), name: 'Test Org' };
      const mockRole = { id: randomUUID(), name: 'admin' };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue(mockOrganization);
      prisma.user.create.mockResolvedValue(mockUser);

      prisma.role.findFirst.mockResolvedValue(mockRole);

      prisma.userRole.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { name: 'admin' },
      });
      expect(prisma.userRole.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });

    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: randomUUID() });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException if admin role is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      prisma.role.findFirst.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const mockUser = {
      id: randomUUID(),
      email: loginDto.email,
      password: 'hashedPassword',
    };

    it('should successfully login a user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

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

    it('should throw UnauthorizedException if password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('assignRole', () => {
    const assignRoleDto: AssignRoleDto = {
      userId: randomUUID(),
      roleId: randomUUID(),
    };
    const mockUser = { id: assignRoleDto.userId, email: 'user@example.com' };
    const mockRole = { id: assignRoleDto.roleId, name: 'ADMIN' };

    it('should successfully assign a role to a user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.role.findUnique.mockResolvedValue(mockRole);
      prisma.userRole.findFirst.mockResolvedValue(null);
      prisma.userRole.create.mockResolvedValue({});

      const result = await service.assignRole(assignRoleDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: assignRoleDto.userId },
      });
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: assignRoleDto.roleId },
      });
      expect(prisma.userRole.create).toHaveBeenCalled();
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
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.assignRole(assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if user already has the role', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.role.findUnique.mockResolvedValue(mockRole);
      prisma.userRole.findFirst.mockResolvedValue({});

      await expect(service.assignRole(assignRoleDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
