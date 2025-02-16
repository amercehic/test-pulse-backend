import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

import { TestExecutionStatus } from '@/test-run/enums/test-status.enum';

export class SubmitTestExecutionResultDto {
  @ApiProperty({
    description: 'The unique identifier of the test execution',
    example: '921f0190-81e5-487a-9727-f8e9fff5da85',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'The updated status of the test execution',
    enum: TestExecutionStatus,
    example: TestExecutionStatus.PASSED,
  })
  @IsOptional()
  @IsEnum(TestExecutionStatus)
  status?: TestExecutionStatus;

  @ApiPropertyOptional({
    description: 'The duration of the test execution in seconds',
    example: 3.45,
  })
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Any logs produced during the test execution',
    example: 'Execution logs here...',
  })
  logs?: string;

  @ApiPropertyOptional({
    description: 'Error message if the test failed',
    example: 'Timeout error',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Stack trace if available',
    example: 'Error at line 42...',
  })
  stackTrace?: string;

  @ApiPropertyOptional({
    description: 'URL of the screenshot captured during the test execution',
    example: 'https://example.com/screenshot.png',
  })
  screenshotUrl?: string;

  @ApiPropertyOptional({
    description: 'URL of the video captured during the test execution',
    example: 'https://example.com/video.mp4',
  })
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the test execution started',
    example: '2025-02-13T19:20:00.000Z',
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when the test execution completed',
    example: '2025-02-13T19:20:05.000Z',
  })
  completedAt?: Date;
}
