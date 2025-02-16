import { PrismaService } from '@db/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApiKeyGuard } from '@/api-key/guards/api-key.guard';
import { ApiKeyService } from '@/api-key/services/api-key.service';
import { AuthModule } from '@/auth/auth.module';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { EitherAuthGuard } from '@/common/guards/either-auth.guard';
import { StorageService } from '@/storage/services/storage.service';

import { StorageController } from './controllers/storage.controller';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [
    StorageService,
    JwtAuthGuard,
    ApiKeyGuard,
    EitherAuthGuard,
    ApiKeyService,
    PrismaService,
  ],
  exports: [StorageService],
  controllers: [StorageController],
})
export class StorageModule {}
