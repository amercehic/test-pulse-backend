import { PrismaService } from '@db/prisma.service';
import { Module } from '@nestjs/common';

import { ApiKeyController } from '@/api-key/controllers/api-key.controller';
import { ApiKeyService } from '@/api-key/services/api-key.service';

@Module({
  controllers: [ApiKeyController],
  providers: [ApiKeyService, PrismaService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
