import { PrismaService } from '@db/prisma.service';
import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { InvitationController } from '@/invitation/controllers/invitation.controller';
import { InvitationService } from '@/invitation/services/invitation.service';

@Module({
  imports: [AuthModule],
  controllers: [InvitationController],
  providers: [InvitationService, PrismaService],
  exports: [InvitationService],
})
export class InvitationModule {}
