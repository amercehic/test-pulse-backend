import { PrismaService } from '@db/prisma.service';
import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module'; // Import AuthModule
import { InvitationController } from '@/invitation/controllers/invitation.controller';
import { InvitationService } from '@/invitation/services/invitation.service';

@Module({
  imports: [AuthModule], // <-- Add AuthModule here
  controllers: [InvitationController],
  providers: [InvitationService, PrismaService],
  exports: [InvitationService],
})
export class InvitationModule {}
