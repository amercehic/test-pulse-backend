import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { EitherAuthGuard } from '@/common/guards/either-auth.guard';

import { TestAnalyticsService } from '../services/test-analytics.service';
import { ExtendedRequest } from '../types/extended-request.type';

@ApiTags('Test Analytics')
@ApiBearerAuth()
@Controller('test-analytics')
@UseGuards(EitherAuthGuard)
export class TestAnalyticsController {
  constructor(private readonly testAnalyticsService: TestAnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Get overview of test analytics including summary stats and trends',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    description: 'Timeframe for trends analysis (day, week, month)',
    enum: ['day', 'week', 'month'],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis (ISO format)',
  })
  async getOverview(
    @Req() req: ExtendedRequest,
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'week',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Organization ID not found');
    }
    return this.testAnalyticsService.getTestTrends(
      organizationId,
      timeframe,
      startDate,
      endDate,
    );
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get historical trends with detailed analytics' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    description: 'Timeframe for trends analysis (day, week, month)',
    enum: ['day', 'week', 'month'],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'framework',
    required: false,
    description: 'Filter by test framework',
  })
  @ApiQuery({
    name: 'browser',
    required: false,
    description: 'Filter by browser',
  })
  async getTrends(
    @Req() req: ExtendedRequest,
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'week',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('framework') framework?: string,
    @Query('browser') browser?: string,
  ) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Organization ID not found');
    }
    return this.testAnalyticsService.getDetailedTrends(
      organizationId,
      timeframe,
      startDate,
      endDate,
      { framework, browser },
    );
  }

  @Get('flaky-tests')
  @ApiOperation({ summary: 'Get list of flaky tests with detailed analysis' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'minFailureRate',
    required: false,
    description: 'Minimum failure rate to consider a test flaky (percentage)',
    type: 'number',
  })
  async getFlakyTests(
    @Req() req: ExtendedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Organization ID not found');
    }
    return this.testAnalyticsService.getFlakyTests(
      organizationId,
      startDate,
      endDate,
    );
  }

  @Get('flaky-tests/advanced')
  @ApiOperation({
    summary:
      'Get advanced flaky test analysis with pattern detection and impact metrics',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'minFlakinessScore',
    required: false,
    description:
      'Minimum flakiness score to consider a test flaky (percentage)',
    type: 'number',
  })
  @ApiQuery({
    name: 'minExecutions',
    required: false,
    description: 'Minimum number of executions required for analysis',
    type: 'number',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort results by metric (flakinessScore, impact, failureRate)',
    enum: ['flakinessScore', 'impact', 'failureRate'],
  })
  @ApiQuery({
    name: 'timeWindow',
    required: false,
    description: 'Analysis period in days (7, 14, 30, etc.)',
    type: 'number',
  })
  async getAdvancedFlakyTests(
    @Req() req: ExtendedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minFlakinessScore') minFlakinessScore?: number,
    @Query('minExecutions') minExecutions?: number,
    @Query('sortBy')
    sortBy: 'flakinessScore' | 'impact' | 'failureRate' = 'flakinessScore',
    @Query('timeWindow') timeWindow?: number,
  ) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Organization ID not found');
    }

    return this.testAnalyticsService.getAdvancedFlakyTests(organizationId, {
      startDate,
      endDate,
      minFlakinessScore,
      minExecutions,
      sortBy,
      timeWindow,
    });
  }

  @Get('flaky-tests/timeline')
  @ApiOperation({
    summary: 'Get historical timeline of test flakiness evolution',
  })
  @ApiQuery({
    name: 'identifier',
    required: false,
    description: 'Optional test identifier to focus on a specific test',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    description: 'Time grouping (day, week, month)',
    enum: ['day', 'week', 'month'],
  })
  @ApiQuery({
    name: 'aggregation',
    required: false,
    description: 'How to aggregate data (count, percentage)',
    enum: ['count', 'percentage'],
  })
  async getFlakyTestsTimeline(
    @Req() req: ExtendedRequest,
    @Query('identifier') identifier?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'week',
    @Query('aggregation') aggregation: 'count' | 'percentage' = 'percentage',
  ) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Organization ID not found');
    }

    return this.testAnalyticsService.getFlakyTestsTimeline(organizationId, {
      identifier,
      startDate,
      endDate,
      groupBy,
      aggregation,
    });
  }
}
