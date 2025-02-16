import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
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

import { SearchDto } from '@/common/dto/search.dto';
import { EitherAuthGuard } from '@/common/guards/either-auth.guard';
import { SearchService } from '@/common/services/search.service';
import { CreateTestRunDto } from '@/test-run/dto/create-test-run.dto';
import { TestRunQueryDto } from '@/test-run/dto/test-run-query.dto';
import { UpdateTestRunDto } from '@/test-run/dto/update-test-run.dto';
import { TestRunService } from '@/test-run/services/test-run.service';
import { ExtendedRequest } from '@/test-run/types/extended-request.type';

@ApiTags('Test Runs')
@ApiBearerAuth()
@Controller('test-runs')
@UseGuards(EitherAuthGuard)
export class TestRunController {
  constructor(
    private readonly testRunService: TestRunService,
    private readonly searchService: SearchService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search test runs' })
  @ApiQuery({ name: 'searchTerm', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async search(@Query() searchDto: SearchDto) {
    return this.searchService.search({
      model: 'testRun',
      searchFields: ['name', 'framework', 'browser', 'platform'],
      searchTerm: searchDto.searchTerm || '',
      include: { testExecutions: true },
      limit: searchDto.limit,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new test run (optionally with ephemeral tests)',
  })
  @ApiBody({
    type: CreateTestRunDto,
    description:
      'Payload to create a new test run (plus optional ephemeral tests)',
  })
  create(
    @Body() createTestRunDto: CreateTestRunDto,
    @Req() req: ExtendedRequest,
  ) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException(
        'Organization ID not found for the authenticated user',
      );
    }
    return this.testRunService.create(createTestRunDto, organizationId);
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
  findAll(@Query() query: TestRunQueryDto, @Req() req: ExtendedRequest) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException(
        'Organization ID not found for the authenticated user',
      );
    }
    return this.testRunService.findAll(query, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific test run by ID' })
  @ApiParam({ name: 'id', description: 'ID of the test run' })
  findOne(@Param('id') id: string, @Req() req: ExtendedRequest) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException(
        'Organization ID not found for the authenticated user',
      );
    }
    return this.testRunService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing test run (e.g., status)' })
  @ApiParam({ name: 'id', description: 'ID of the test run to update' })
  @ApiBody({ type: UpdateTestRunDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestRunDto,
    @Req() req: ExtendedRequest,
  ) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException(
        'Organization ID not found for the authenticated user',
      );
    }
    return this.testRunService.update(id, dto, organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a test run by ID' })
  @ApiParam({ name: 'id', description: 'ID of the test run to delete' })
  remove(@Param('id') id: string, @Req() req: ExtendedRequest) {
    const organizationId =
      (req.user && (req.user as any).organizationId) || req.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException(
        'Organization ID not found for the authenticated user',
      );
    }
    return this.testRunService.remove(id, organizationId);
  }
}
