import { PrismaService } from '@db/prisma.service';
import { Module } from '@nestjs/common';

import { StorageModule } from '@/storage/storage.module';
import { TestExecutionController } from '@/test-run/controllers/test-execution.controller';
import { TestRunController } from '@/test-run/controllers/test-run.controller';
import { TestExecutionService } from '@/test-run/services/test-execution.service';
import { TestRunService } from '@/test-run/services/test-run.service';

@Module({
  imports: [StorageModule],
  controllers: [TestRunController, TestExecutionController],
  providers: [TestRunService, TestExecutionService, PrismaService], // Register PrismaService here
})
export class TestRunModule {}
