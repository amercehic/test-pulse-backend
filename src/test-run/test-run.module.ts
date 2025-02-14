import { PrismaService } from '@db/prisma.service';
import { Module } from '@nestjs/common';

import { ApiKeyGuard } from '@/api-key/guards/api-key.guard';
import { ApiKeyService } from '@/api-key/services/api-key.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { EitherAuthGuard } from '@/common/guards/either-auth.guard';
import { SearchService } from '@/common/services/search.service';
import { StorageModule } from '@/storage/storage.module';
import { TestExecutionController } from '@/test-run/controllers/test-execution.controller';
import { TestRunController } from '@/test-run/controllers/test-run.controller';
import { TestExecutionService } from '@/test-run/services/test-execution.service';
import { TestRunService } from '@/test-run/services/test-run.service';

@Module({
  imports: [StorageModule],
  controllers: [TestRunController, TestExecutionController],
  providers: [
    TestRunService,
    TestExecutionService,
    PrismaService,
    JwtAuthGuard,
    ApiKeyGuard,
    EitherAuthGuard,
    ApiKeyService,
    SearchService,
  ],
})
export class TestRunModule {}
