import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@db/prisma.service';
import { InviteUserDto } from '@/invitation/dto/invite.dto';
import { AcceptInviteDto } from '@/invitation/dto/accept-invite.dto';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Service handling user invitations within organizations
 */
@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new invitation for a user to join an organization
   * @param inviteUserDto - The invitation details including email and roleId
   * @param adminId - The ID of the admin creating the invitation
   * @returns Object containing success message and invitation token
   * @throws UnauthorizedException if admin doesn't belong to an organization
   * @throws ConflictException if user already exists or has pending invite
   */
  async inviteUser(inviteUserDto: InviteUserDto, adminId: string) {
    const { email, roleId } = inviteUserDto;

    // Check if admin exists and has organization
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin?.organizationId) {
      throw new UnauthorizedException(
        'Admin does not belong to any organization.',
      );
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Check for pending invitations
    const pendingInvite = await this.prisma.invitation.findFirst({
      where: {
        email,
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (pendingInvite) {
      throw new ConflictException('User already has a pending invite');
    }

    const token = randomUUID();

    await this.prisma.invitation.create({
      data: {
        email,
        organizationId: admin.organizationId,
        roleId,
        token,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { message: 'Invitation sent successfully', token };
  }

  /**
   * Processes the acceptance of an invitation
   * @param acceptInviteDto - The acceptance details including token and password
   * @returns Object containing success message
   * @throws NotFoundException if invitation is invalid
   * @throws UnauthorizedException if invitation has expired
   */
  async acceptInvite(acceptInviteDto: AcceptInviteDto) {
    const { token, password } = acceptInviteDto;

    const invite = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (
      invite.status !== 'pending' ||
      new Date(invite.expiresAt) < new Date()
    ) {
      throw new UnauthorizedException(
        'This invitation has expired or is no longer valid',
      );
    }

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (!user) {
      // Hash password before creating user
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: invite.email,
          password: hashedPassword,
          organizationId: invite.organizationId,
        },
      });

      // Assign role to user
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: invite.roleId,
        },
      });
    }

    // Mark invitation as accepted
    await this.prisma.invitation.update({
      where: { token },
      data: { status: 'accepted' },
    });

    return { message: 'Invitation accepted successfully' };
  }

  /**
   * Retrieves all invitations, optionally filtered by status
   * @param status - Optional status filter for invitations
   * @returns Array of invitation records
   */
  async getInvitations(status?: string) {
    return this.prisma.invitation.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revokes an existing invitation
   * @param token - The invitation token to revoke
   * @returns Object containing success message
   * @throws NotFoundException if invitation is not found
   */
  async revokeInvitation(token: string) {
    const invite = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.invitation.update({
      where: { token },
      data: { status: 'expired' },
    });

    return { message: 'Invitation revoked successfully' };
  }

  /**
   * Updates the role of an existing invitation
   * @param token - The invitation token to update
   * @param roleId - The new role ID to assign
   * @returns Updated invitation record
   * @throws NotFoundException if invitation is not found
   */
  async updateInvitation(token: string, roleId: string) {
    const invite = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    return this.prisma.invitation.update({
      where: { token },
      data: { roleId },
    });
  }
}
