import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Prisma Service
import { TestRunController } from './test-run.controller';
import { TestRunService } from './test-run.service';

@Module({
  controllers: [TestRunController],
  providers: [TestRunService, PrismaService], // Register PrismaService here
})
export class TestRunModule {}
