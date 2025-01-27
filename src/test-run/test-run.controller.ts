import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TestRunService } from './test-run.service';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { TestRunQueryDto } from './dto/test-run-query.dto';

@Controller('test-runs')
export class TestRunController {
  constructor(private readonly testRunService: TestRunService) {}

  @Post()
  create(@Body() createTestRunDto: CreateTestRunDto) {
    return this.testRunService.create(createTestRunDto);
  }

  @Get()
  findAll(@Query() query: TestRunQueryDto) {
    return this.testRunService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.testRunService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateTestRunDto: UpdateTestRunDto) {
    return this.testRunService.update(id, updateTestRunDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.testRunService.remove(id);
  }
}
