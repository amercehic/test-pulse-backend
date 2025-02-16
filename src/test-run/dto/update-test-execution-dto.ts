import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

import { TestExecutionStatus } from '@/test-run/enums/test-status.enum';

export class UpdateTestExecutionDto {
  @ApiProperty({
    description: 'Execution status',
    enum: TestExecutionStatus,
    example: TestExecutionStatus.PASSED,
  })
  @IsOptional()
  @IsEnum(TestExecutionStatus)
  status?: TestExecutionStatus;

  @ApiProperty({ description: 'Execution duration in seconds', example: 5.2 })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiProperty({ description: 'Logs generated during test execution' })
  @IsOptional()
  @IsString()
  logs?: string;

  @ApiProperty({ description: 'Error message if the test failed' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({ description: 'Stack trace if the test failed' })
  @IsOptional()
  @IsString()
  stackTrace?: string;

  @ApiProperty({ description: 'File key for the screenshot if available' })
  @IsOptional()
  @IsString()
  screenshotKey?: string;

  @ApiProperty({ description: 'File key for the execution video if available' })
  @IsOptional()
  @IsString()
  videoKey?: string;
}
