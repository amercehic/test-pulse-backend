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

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let loggerSpy: jest.SpyInstance;

  // Mock services
  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    userRole: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: any) => any) =>
      callback(mockPrismaService),
    ),
  };

  const mockJwtService = {
    sign: jest.fn(),
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

    // Spy on logger to prevent console output during tests
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
      organizationId: 1,
    };

    it('should successfully register a new user', async () => {
      const hashedPassword = 'hashedPassword123';
      const mockUser = { id: 1, email: registerDto.email };
      const mockToken = 'jwt.token.here';

      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockImplementation(() =>
        Promise.resolve(hashedPassword),
      );
      prisma.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          organizationId: registerDto.organizationId,
        },
      });
      expect(result).toEqual({ user: mockUser, token: mockToken });
    });

    it('should throw UnauthorizedException if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
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
      const mockToken = 'jwt.token.here';

      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockImplementation(() =>
        Promise.resolve(true),
      );
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(loginDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(result).toEqual({ user: mockUser, token: mockToken });
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
        data: {
          userId: assignRoleDto.userId,
          roleId: assignRoleDto.roleId,
        },
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

  describe('generateToken', () => {
    it('should generate a JWT token successfully', async () => {
      const userId = 1;
      const email = 'test@example.com';
      const mockToken = 'jwt.token.here';

      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service['generateToken'](userId, email);

      expect(jwtService.sign).toHaveBeenCalledWith({ userId, email });
      expect(result).toBe(mockToken);
    });

    it('should throw InternalServerErrorException if token generation fails', async () => {
      const userId = 1;
      const email = 'test@example.com';

      mockJwtService.sign.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      // Call generateToken through register to properly trigger error handling
      const registerDto = {
        email,
        password: 'password123',
        organizationId: 1,
      };

      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      prisma.user.create.mockResolvedValue({ id: userId, email });

      await expect(service.register(registerDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
