import { Module } from '@nestjs/common';
import { TestResultsController } from './test-results.controller';
import { TestResultsService } from './test-results.service';

@Module({
  providers: [TestResultsService],
  controllers: [TestResultsController],
})
export class TestResultsModule {}
