import { PrismaService } from '@db/prisma.service';
import { Module } from '@nestjs/common';

import { InvitationController } from '@/invitation/controllers/invitation.controller';
import { InvitationService } from '@/invitation/services/invitation.service';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService, PrismaService],
  exports: [InvitationService],
})
export class InvitationModule {}
