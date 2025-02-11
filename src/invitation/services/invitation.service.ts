import { PrismaService } from '@db/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { AuthService } from '@/auth/services/auth.service';
import { AcceptInviteDto } from '@/invitation/dto/accept-invite.dto';
import { InviteUserDto } from '@/invitation/dto/invite.dto';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Creates a new invitation for a user to join an organization
   * @param inviteUserDto - The invitation details including email and role
   * @param adminId - ID of the admin creating the invitation
   * @returns Object containing success message and invitation token
   * @throws {NotFoundException} When the specified role doesn't exist
   * @throws {UnauthorizedException} When admin doesn't belong to an organization
   * @throws {ConflictException} When user already exists or has pending invite
   */
  async inviteUser(inviteUserDto: InviteUserDto, adminId: string) {
    const { email, roleName } = inviteUserDto;
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }
    const roleId = role.id;
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin?.organizationId) {
      throw new UnauthorizedException(
        'Admin does not belong to any organization.',
      );
    }
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    const pendingInvite = await this.prisma.invitation.findFirst({
      where: { email, status: 'pending', expiresAt: { gt: new Date() } },
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
   * Processes an invitation acceptance
   * @param acceptInviteDto - The acceptance details including token and user info
   * @returns Object containing success message
   * @throws {NotFoundException} When invitation is invalid
   * @throws {UnauthorizedException} When invitation has expired or is invalid
   */
  async acceptInvite(acceptInviteDto: AcceptInviteDto) {
    const { token, password, firstName, lastName } = acceptInviteDto;
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
    let user = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await this.authService.createUser({
        firstName,
        lastName,
        email: invite.email,
        password: hashedPassword,
        organizationId: invite.organizationId,
      });
      await this.prisma.userRole.create({
        data: {
          userId: user!.id,
          roleId: invite.roleId,
        },
      });
    }
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
   * @throws {NotFoundException} When invitation is not found
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
   * @param roleName - The new role name to assign
   * @returns Updated invitation record
   * @throws {NotFoundException} When invitation or role is not found
   */
  async updateInvitation(token: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }
    const roleId = role.id;
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
