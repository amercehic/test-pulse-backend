import { CreateTestResultDto } from '@/test-results/dto/create-test-result.dto';
import { TestResultsService } from '@/test-results/services/test-results.service';
import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('test-results')
export class TestResultsController {
  constructor(private readonly testResultsService: TestResultsService) {}

  @Post()
  create(@Body() dto: CreateTestResultDto): Record<string, any> {
    return this.testResultsService.create(dto);
  }

  @Get()
  findAll(): Array<Record<string, any>> {
    return this.testResultsService.findAll();
  }
}
