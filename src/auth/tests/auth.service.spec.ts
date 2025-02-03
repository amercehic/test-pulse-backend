import { PrismaService } from '@db/prisma.service';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { LoginUserDto } from '@/auth/dto/login-user.dto';
import { RegisterUserDto } from '@/auth/dto/register-user.dto';
import { AuthService } from '@/auth/services/auth.service';
import { AssignRoleDto } from '@/roles/dto/assign-role.dto';
import { RoleEnum } from '@/roles/roles.enum';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let loggerSpy: jest.SpyInstance;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(), // ✅ Lookup by role name instead of UUID
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
    sign: jest.fn().mockReturnValue('jwt.token.here'),
  };

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
      const mockUser = { id: 'user-uuid', email: registerDto.email };
      const mockOrganization = { id: 'org-uuid', name: 'Test Org' };
      const mockRole = { id: 'role-uuid', name: 'admin' };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue(mockOrganization);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.role.findUnique.mockResolvedValue(mockRole);
      prisma.userRole.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'admin' },
      });
      expect(prisma.userRole.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });

    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user-uuid' });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException if admin role is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue(null);

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
      id: 'user-uuid',
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
      userId: 'user-uuid',
      roleName: RoleEnum.ADMIN,
    };
    const mockUser = { id: assignRoleDto.userId, email: 'user@example.com' };
    const mockRole = { id: 'role-uuid', name: assignRoleDto.roleName };

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
        where: { name: assignRoleDto.roleName },
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
