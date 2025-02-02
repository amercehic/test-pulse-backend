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
 * Service for handling user invitations.
 */
@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sends an invitation to a user via email, allowing them to join an organization with a specified role.
   * @param inviteUserDto - DTO containing email, organizationId, and roleId.
   * @returns A success message and the generated invitation token.
   * @throws ConflictException if the user already exists or has a pending invite.
   */
  async inviteUser(inviteUserDto: InviteUserDto, adminId: number) {
    const { email, roleId } = inviteUserDto;

    // 🔹 Retrieve the admin's organization
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { organizationId: true },
    });

    if (!admin || !admin.organizationId) {
      throw new UnauthorizedException(
        'Admin does not belong to any organization.',
      );
    }

    // 🔹 Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // 🔹 Check if an active invite exists
    const existingInvite = await this.prisma.invitation.findFirst({
      where: { email, organizationId: admin.organizationId, status: 'pending' },
    });
    if (existingInvite) {
      throw new ConflictException('User already has a pending invite');
    }

    // 🔹 Generate a unique invite token
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Invite expires in 7 days

    // 🔹 Store invite in database
    await this.prisma.invitation.create({
      data: {
        email,
        organizationId: admin.organizationId, // ✅ Auto-assign organization
        roleId,
        token,
        expiresAt,
      },
    });

    // 🔹 TODO: Integrate email service to send invitation email to the user

    return { message: 'Invitation sent successfully', token };
  }

  /**
   * Accepts an invitation using a token, allowing a user to register or join an organization.
   * @param acceptInviteDto - DTO containing the invite token and password.
   * @returns A success message upon successful invite acceptance.
   * @throws NotFoundException if the invitation does not exist.
   * @throws UnauthorizedException if the invitation is expired or invalid.
   */
  async acceptInvite(acceptInviteDto: AcceptInviteDto) {
    const { token, password } = acceptInviteDto;

    // Find invite by token
    const invite = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invite) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    // Ensure invite is still valid
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
    }

    // Assign role to user if not already assigned
    const existingRole = await this.prisma.userRole.findFirst({
      where: { userId: user.id, roleId: invite.roleId },
    });

    if (!existingRole) {
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
   * Retrieves all invitations, optionally filtered by status.
   * @param status - Optional status filter (pending, accepted, expired).
   * @returns List of invitations.
   */
  async getInvitations(status?: string) {
    return this.prisma.invitation.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revokes an invitation by marking it as expired.
   * @param token - Invitation token.
   * @returns A success message if revocation is successful.
   * @throws NotFoundException if the invitation does not exist.
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
   * Updates an invitation (e.g., changing the assigned role).
   * @param token - Invitation token.
   * @param roleId - New role ID.
   * @returns The updated invitation.
   * @throws NotFoundException if the invitation does not exist.
   */
  async updateInvitation(token: string, roleId: number) {
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
