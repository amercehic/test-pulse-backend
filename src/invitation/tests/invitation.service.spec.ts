import { PrismaService } from '@db/prisma.service';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';

import { AcceptInviteDto } from '@/invitation/dto/accept-invite.dto';
import { InviteUserDto } from '@/invitation/dto/invite.dto';
import { InvitationService } from '@/invitation/services/invitation.service';

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
    const inviteDto: InviteUserDto = {
      email: 'invite@example.com',
      roleName: 'admin',
    };
    const adminId = randomUUID();
    const organizationId = randomUUID();
    const roleId = randomUUID();

    beforeEach(() => {
      // ✅ Mock role lookup
      prisma.role.findUnique.mockResolvedValue({ id: roleId, name: 'admin' });
    });

    it('should send an invitation successfully', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: adminId, organizationId }) // Admin user
        .mockResolvedValueOnce(null); // Invited user does not exist
      prisma.invitation.findFirst.mockResolvedValue(null); // No pending invite
      prisma.invitation.create.mockResolvedValue({ token: 'generated-token' });

      const result = await service.inviteUser(inviteDto, adminId);

      expect(prisma.invitation.create).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Invitation sent successfully',
        token: expect.stringMatching(/^[0-9a-fA-F-]{36}$/), // Ensure UUID format
      });
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

    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: adminId, organizationId }) // Admin user
        .mockResolvedValueOnce({ id: randomUUID() }); // User already exists

      await expect(service.inviteUser(inviteDto, adminId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if user has a pending invite', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: adminId, organizationId }) // Admin user
        .mockResolvedValueOnce(null); // Invited user does not exist
      prisma.invitation.findFirst.mockResolvedValue({ status: 'pending' }); // Pending invite exists

      await expect(service.inviteUser(inviteDto, adminId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('acceptInvite', () => {
    const acceptDto: AcceptInviteDto = {
      token: 'valid-token',
      password: 'password123',
    };
    const userId = randomUUID();
    const organizationId = randomUUID();
    const roleId = randomUUID();

    beforeEach(() => {
      prisma.role.findUnique.mockResolvedValue({ id: roleId, name: 'admin' });
    });

    it('should accept an invitation and create a user if they do not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        token: acceptDto.token,
        email: 'newuser@example.com',
        organizationId,
        roleId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 10000),
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: userId,
        email: 'newuser@example.com',
      });
      prisma.userRole.findFirst.mockResolvedValue(null);
      prisma.userRole.create.mockResolvedValue({});
      prisma.invitation.update.mockResolvedValue({ status: 'accepted' });

      const result = await service.acceptInvite(acceptDto);

      expect(prisma.user.create).toHaveBeenCalled(); // Ensure user is created
      expect(prisma.userRole.create).toHaveBeenCalled(); // Ensure role is assigned
      expect(prisma.invitation.update).toHaveBeenCalled(); // Ensure invite is marked as accepted
      expect(result).toEqual({ message: 'Invitation accepted successfully' });
    });
  });

  describe('updateInvitation', () => {
    const roleId = randomUUID();

    beforeEach(() => {
      prisma.role.findUnique.mockResolvedValue({ id: roleId, name: 'admin' });
    });

    it('should update an invitation role', async () => {
      prisma.invitation.findUnique.mockResolvedValue({ token: 'valid-token' });
      prisma.invitation.update.mockResolvedValue({});

      const result = await service.updateInvitation('valid-token', 'admin');

      expect(prisma.invitation.update).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should throw NotFoundException if role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(
        service.updateInvitation('valid-token', 'invalid-role'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
