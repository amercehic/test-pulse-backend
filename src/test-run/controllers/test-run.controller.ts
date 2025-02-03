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
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateTestRunDto } from '@/test-run/dto/create-test-run.dto';
import { TestRunQueryDto } from '@/test-run/dto/test-run-query.dto';
import { UpdateTestRunDto } from '@/test-run/dto/update-test-run.dto';
import { TestRunService } from '@/test-run/services/test-run.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@ApiTags('Test Runs') // Group endpoints under "Test Runs"
@ApiBearerAuth()
@Controller('test-runs')
@UseGuards(JwtAuthGuard)
export class TestRunController {
  constructor(private readonly testRunService: TestRunService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new test run' }) // Description for the endpoint
  @ApiBody({
    type: CreateTestRunDto,
    description: 'Payload to create a new test run',
  }) // Describe the request body
  create(@Body() createTestRunDto: CreateTestRunDto) {
    return this.testRunService.create(createTestRunDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all test runs',
    description: 'Retrieve a list of all test runs with optional filters',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (passed or failed)',
  })
  @ApiQuery({
    name: 'framework',
    required: false,
    description: 'Filter by test framework (e.g., Playwright, Cypress)',
  })
  @ApiQuery({
    name: 'browser',
    required: false,
    description: 'Filter by browser (e.g., Chrome, Firefox)',
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: 'Filter by platform (e.g., Windows, macOS)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by (default: createdAt)',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    description: 'Sort order (ASC or DESC, default: DESC)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results per page (default: 10)',
  })
  findAll(@Query() query: TestRunQueryDto) {
    return this.testRunService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a test run by ID',
    description: 'Retrieve a specific test run by its ID',
  })
  @ApiParam({ name: 'id', description: 'ID of the test run', example: 1 }) // Describe the parameter
  findOne(@Param('id') id: string) {
    return this.testRunService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a test run',
    description: 'Update the details of a specific test run by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the test run to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateTestRunDto,
    description: 'Payload to update the test run',
  })
  update(@Param('id') id: string, @Body() updateTestRunDto: UpdateTestRunDto) {
    return this.testRunService.update(id, updateTestRunDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a test run',
    description: 'Delete a specific test run by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the test run to delete',
    example: 1,
  })
  remove(@Param('id') id: string) {
    return this.testRunService.remove(id);
  }
}
