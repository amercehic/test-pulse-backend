import { PrismaService } from '@db/prisma.service';
import { Module } from '@nestjs/common';

import { TestRunController } from '@/test-run/controllers/test-run.controller';
import { TestRunService } from '@/test-run/services/test-run.service';

@Module({
  controllers: [TestRunController],
  providers: [TestRunService, PrismaService], // Register PrismaService here
})
export class TestRunModule {}
