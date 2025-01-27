import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestRun } from './test-run.entity';
import { Test } from './test.entity';
import { TestHistory } from './test-history.entity';
import { TestRunController } from './test-run.controller';
import { TestRunService } from './test-run.service';

@Module({
  imports: [TypeOrmModule.forFeature([TestRun, Test, TestHistory])],
  controllers: [TestRunController],
  providers: [TestRunService],
})
export class TestRunModule {}
