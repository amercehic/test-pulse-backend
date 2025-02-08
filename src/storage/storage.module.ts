import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StorageService } from '@/storage/services/storage.service';

@Module({
  imports: [ConfigModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
