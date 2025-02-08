import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTestExecutionDto {
  @ApiProperty({ description: 'Execution status', example: 'passed' })
  @IsOptional()
  @IsIn(['queued', 'running', 'passed', 'failed', 'skipped', 'cancelled'])
  status?: string;

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

  @ApiProperty({ description: 'URL to screenshot if available' })
  @IsOptional()
  @IsString()
  screenshotUrl?: string;

  @ApiProperty({ description: 'URL to execution video if available' })
  @IsOptional()
  @IsString()
  videoUrl?: string;
}
