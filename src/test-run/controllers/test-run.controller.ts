// test-run/controllers/test-run.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { CreateTestRunDto } from '../dto/create-test-run.dto';
import { TestRunQueryDto } from '../dto/test-run-query.dto';
import { UpdateTestRunDto } from '../dto/update-test-run.dto';
import { TestRunService } from '../services/test-run.service';

@ApiTags('Test Runs')
@ApiBearerAuth()
@Controller('test-runs')
@UseGuards(JwtAuthGuard)
export class TestRunController {
  constructor(private readonly testRunService: TestRunService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new test run (optionally with ephemeral tests)',
  })
  @ApiBody({
    type: CreateTestRunDto,
    description:
      'Payload to create a new test run (plus optional ephemeral tests)',
  })
  create(@Body() createTestRunDto: CreateTestRunDto) {
    return this.testRunService.create(createTestRunDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all test runs with optional filtering/pagination',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'framework', required: false })
  @ApiQuery({ name: 'browser', required: false })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'order', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: TestRunQueryDto) {
    return this.testRunService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific test run by ID' })
  @ApiParam({ name: 'id', description: 'ID of the test run' })
  findOne(@Param('id') id: string) {
    return this.testRunService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing test run (e.g., status)' })
  @ApiParam({ name: 'id', description: 'ID of the test run to update' })
  @ApiBody({ type: UpdateTestRunDto })
  update(@Param('id') id: string, @Body() updateTestRunDto: UpdateTestRunDto) {
    return this.testRunService.update(id, updateTestRunDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a test run by ID' })
  @ApiParam({ name: 'id', description: 'ID of the test run to delete' })
  remove(@Param('id') id: string) {
    return this.testRunService.remove(id);
  }
}
