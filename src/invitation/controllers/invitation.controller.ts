import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvitationService } from '@/invitation/services/invitation.service';
import { InviteUserDto } from '@/invitation/dto/invite.dto';
import { AcceptInviteDto } from '@/invitation/dto/accept-invite.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Request } from 'express';

@ApiTags('Invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super')
  @Post()
  @ApiOperation({ summary: 'Invite a user to an organization' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({
    status: 409,
    description: 'User already exists or has a pending invite',
  })
  async inviteUser(@Body() inviteUserDto: InviteUserDto, @Req() req: Request) {
    const adminId = (req.user as { userId: number }).userId;
    return this.invitationService.inviteUser(inviteUserDto, adminId);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept an invitation and complete registration' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 404, description: 'Invalid or expired invitation' })
  @ApiResponse({
    status: 401,
    description: 'This invitation has expired or is no longer valid',
  })
  async acceptInvite(@Body() acceptInviteDto: AcceptInviteDto) {
    return this.invitationService.acceptInvite(acceptInviteDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super')
  @ApiOperation({ summary: 'Get a list of invitations' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (pending, accepted, expired)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invitations retrieved successfully',
  })
  async getInvitations(@Query('status') status?: string) {
    return this.invitationService.getInvitations(status);
  }

  @Delete(':token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super')
  @ApiOperation({ summary: 'Revoke an invitation' })
  @ApiParam({ name: 'token', description: 'The invitation token' })
  @ApiResponse({ status: 200, description: 'Invitation revoked successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async revokeInvitation(@Param('token') token: string) {
    return this.invitationService.revokeInvitation(token);
  }

  @Patch(':token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super')
  @ApiOperation({ summary: 'Update an invitation (e.g., changing role)' })
  @ApiParam({ name: 'token', description: 'The invitation token' })
  @ApiQuery({ name: 'roleId', required: true, description: 'New role ID' })
  @ApiResponse({ status: 200, description: 'Invitation updated successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async updateInvitation(
    @Param('token') token: string,
    @Query('roleId') roleId: number,
  ) {
    return this.invitationService.updateInvitation(token, roleId);
  }
}
