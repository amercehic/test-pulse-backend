import { Module } from '@nestjs/common';
import { PrismaService } from '@db/prisma.service';
import { InvitationController } from '@/invitation/controllers/invitation.controller';
import { InvitationService } from '@/invitation/services/invitation.service';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService, PrismaService],
  exports: [InvitationService],
})
export class InvitationModule {}
