import { Body, Controller, Get, Post } from '@nestjs/common';
import { TestResultsService } from './test-results.service';
import { CreateTestResultDto } from './dto/create-test-result.dto';

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
