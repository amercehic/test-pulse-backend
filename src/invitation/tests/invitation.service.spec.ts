import { Test, TestingModule } from '@nestjs/testing';
import { InvitationService } from '@/invitation/services/invitation.service';
import { PrismaService } from '@db/prisma.service';
import { InviteUserDto } from '@/invitation/dto/invite.dto';
import { AcceptInviteDto } from '@/invitation/dto/accept-invite.dto';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
}));

describe('InvitationService', () => {
  let service: InvitationService;
  let prisma: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    invitation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userRole: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('inviteUser', () => {
    const inviteDto: InviteUserDto = { email: 'invite@example.com', roleId: 2 };
    const adminId = 1;

    it('should send an invitation successfully', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: adminId,
        organizationId: 10,
      });
      prisma.user.findUnique.mockResolvedValueOnce(null); // User does not exist
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue({ token: 'generated-token' });

      const result = await service.inviteUser(inviteDto, adminId);

      expect(prisma.invitation.create).toHaveBeenCalled();

      // ✅ Check that the token is a valid UUID instead of a fixed value
      expect(result).toEqual({
        message: 'Invitation sent successfully',
        token: expect.stringMatching(/^[0-9a-fA-F-]{36}$/), // Regex for UUID
      });

      // ✅ Alternatively, check using `isUUID`
      expect(isUUID(result.token)).toBe(true);
    });

    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: adminId,
        organizationId: 10,
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 2,
        email: inviteDto.email,
      });

      await expect(service.inviteUser(inviteDto, adminId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if user has a pending invite', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: adminId,
        organizationId: 10,
      });
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.invitation.findFirst.mockResolvedValue({ status: 'pending' });

      await expect(service.inviteUser(inviteDto, adminId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw UnauthorizedException if admin is not in an organization', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: adminId,
        organizationId: null,
      });

      await expect(service.inviteUser(inviteDto, adminId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('acceptInvite', () => {
    const acceptDto: AcceptInviteDto = {
      token: 'valid-token',
      password: 'password123',
    };

    it('should accept an invitation and create a user', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        token: acceptDto.token,
        email: 'newuser@example.com',
        organizationId: 10,
        roleId: 2,
        status: 'pending',
        expiresAt: new Date(Date.now() + 10000),
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 1,
        email: 'newuser@example.com',
      });
      prisma.userRole.findFirst.mockResolvedValue(null);
      prisma.userRole.create.mockResolvedValue({});

      const result = await service.acceptInvite(acceptDto);

      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.invitation.update).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Invitation accepted successfully' });
    });

    it('should throw NotFoundException if invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvite(acceptDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if invitation is expired', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        token: acceptDto.token,
        expiresAt: new Date(Date.now() - 10000),
        status: 'pending',
      });

      await expect(service.acceptInvite(acceptDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getInvitations', () => {
    it('should return a list of invitations', async () => {
      prisma.invitation.findMany.mockResolvedValue([
        { id: 1, email: 'user@example.com' },
      ]);

      const result = await service.getInvitations();

      expect(prisma.invitation.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should return filtered invitations by status', async () => {
      prisma.invitation.findMany.mockResolvedValue([
        { id: 2, email: 'pending@example.com' },
      ]);

      const result = await service.getInvitations('pending');

      expect(prisma.invitation.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke an invitation successfully', async () => {
      prisma.invitation.findUnique.mockResolvedValue({ token: 'valid-token' });
      prisma.invitation.update.mockResolvedValue({});

      const result = await service.revokeInvitation('valid-token');

      expect(prisma.invitation.update).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Invitation revoked successfully' });
    });

    it('should throw NotFoundException if invitation is not found', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.revokeInvitation('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateInvitation', () => {
    it('should update an invitation role', async () => {
      prisma.invitation.findUnique.mockResolvedValue({ token: 'valid-token' });
      prisma.invitation.update.mockResolvedValue({});

      const result = await service.updateInvitation('valid-token', 3);

      expect(prisma.invitation.update).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should throw NotFoundException if invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.updateInvitation('invalid-token', 3),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
