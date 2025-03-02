import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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

import { EitherAuthGuard } from '@/common/guards/either-auth.guard';
import { RetryTestsDto } from '@/test-run/dto/retry-tests.dto';
import { SubmitTestExecutionResultDto } from '@/test-run/dto/submit-test-execution-result.dto';
import { TestExecutionService } from '@/test-run/services/test-execution.service';

@ApiTags('Test Executions')
@ApiBearerAuth()
@Controller('test-executions')
@UseGuards(EitherAuthGuard)
export class TestExecutionController {
  constructor(private readonly testExecutionService: TestExecutionService) {}

  @Get('history/:identifier')
  @ApiOperation({ summary: 'Get history of a specific test by its identifier' })
  @ApiParam({
    name: 'identifier',
    description: 'Unique identifier hash of the test',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter results from this date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter results until this date (ISO format)',
  })
  async getTestHistory(
    @Param('identifier') identifier: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.testExecutionService.getTestHistory(
      identifier,
      startDate,
      endDate,
    );
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare test executions across different runs' })
  @ApiQuery({
    name: 'identifiers',
    required: true,
    description: 'Comma-separated list of test identifiers to compare',
    type: String,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Compare from this date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Compare until this date (ISO format)',
  })
  async compareTests(
    @Query('identifiers') identifiers: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const identifierArray = identifiers.split(',');
    return this.testExecutionService.compareTests(
      identifierArray,
      startDate,
      endDate,
    );
  }

  @Get('duration/trend')
  @ApiOperation({ summary: 'Get execution duration trends over time' })
  @ApiQuery({
    name: 'identifier',
    required: false,
    description: 'Filter by specific test identifier',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Analyze from this date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Analyze until this date (ISO format)',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    description: 'Group results by day, week, or month',
    enum: ['day', 'week', 'month'],
  })
  async getDurationTrend(
    @Query('identifier') identifier?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.testExecutionService.getDurationTrend(
      identifier,
      startDate,
      endDate,
      groupBy,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific test execution by its ID' })
  @ApiParam({ name: 'id', description: 'ID of the test execution' })
  async getTestExecution(@Param('id') id: string) {
    return this.testExecutionService.getTestExecution(id);
  }

  @Post('results')
  @ApiOperation({
    summary:
      'Submit result(s) for one or more test executions based on their ID(s)',
  })
  @ApiBody({
    type: SubmitTestExecutionResultDto,
    isArray: true,
    description:
      'A single object or an array of objects containing test execution IDs and result data',
  })
  async submitResults(
    @Body() dto: SubmitTestExecutionResultDto | SubmitTestExecutionResultDto[],
  ) {
    return this.testExecutionService.submitResults(dto);
  }

  @Get(':testRunId/attempt/:attempt')
  @ApiOperation({
    summary: 'Get a specific attempt within a test run (e.g., attempt=2).',
  })
  @ApiParam({
    name: 'testRunId',
    description: 'ID of the test run that contains this execution',
  })
  @ApiParam({
    name: 'attempt',
    description: 'Attempt number (1,2,3,…) for the test in that run',
    example: 2,
  })
  async getAttempt(
    @Param('testRunId') testRunId: string,
    @Param('attempt') attempt: number,
  ) {
    return this.testExecutionService.getAttempt(testRunId, Number(attempt));
  }

  @Post('retry')
  @ApiOperation({
    summary: 'Partial rerun (retry) of specific test executions in a run',
  })
  @ApiBody({
    type: RetryTestsDto,
    description: 'Test run ID + array of testExecution IDs to be retried',
  })
  async retry(@Body() dto: RetryTestsDto) {
    return this.testExecutionService.retryTests(dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a test execution by ID',
    description: 'Removes a single test execution record',
  })
  @ApiParam({ name: 'id', description: 'ID of the test execution to delete' })
  async remove(@Param('id') id: string) {
    return this.testExecutionService.remove(id);
  }
}
