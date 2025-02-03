import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { CreateTestDto } from '@/test-run/dto/create-test.dto';

export class CreateTestRunDto {
  @ApiProperty({ description: 'Name of the test run' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @ApiProperty({
    description: 'Triggered by (e.g., CI/CD)',
    example: 'CI/CD Pipeline',
  })
  @IsNotEmpty({ message: 'TriggeredBy is required' })
  @IsString({ message: 'TriggeredBy must be a string' })
  triggeredBy: string;

  @ApiProperty({ description: 'Status of the test run', example: 'passed' })
  @IsNotEmpty({ message: 'Status is required' })
  @IsIn(['passed', 'failed'], {
    message: 'Status must be either "passed" or "failed"',
  })
  status: 'passed' | 'failed';

  @ApiProperty({
    description: 'Total duration of the test run in seconds',
    example: 120,
  })
  @IsNotEmpty({ message: 'Duration is required' })
  @IsNumber({}, { message: 'Duration must be a number' })
  duration: number;

  @ApiProperty({ description: 'Commit hash associated with the test run' })
  @IsNotEmpty({ message: 'Commit is required' })
  @IsString({ message: 'Commit must be a string' })
  commit: string;

  @ApiProperty({ description: 'Branch name associated with the test run' })
  @IsNotEmpty({ message: 'Branch is required' })
  @IsString({ message: 'Branch must be a string' })
  branch: string;

  @ApiProperty({
    description: 'Framework used for the test run',
    example: 'Playwright',
  })
  @IsNotEmpty({ message: 'Framework is required' })
  @IsString({ message: 'Framework must be a string' })
  framework: string;

  @ApiProperty({
    description: 'Browser used for the test run',
    example: 'Chrome',
  })
  @IsNotEmpty({ message: 'Browser is required' })
  @IsString({ message: 'Browser must be a string' })
  browser: string;

  @ApiProperty({ description: 'Browser version', example: '96.0' })
  @IsNotEmpty({ message: 'Browser version is required' })
  @IsString({ message: 'Browser version must be a string' })
  browserVersion: string;

  @ApiProperty({
    description: 'Platform used for the test run',
    example: 'Windows',
  })
  @IsNotEmpty({ message: 'Platform is required' })
  @IsString({ message: 'Platform must be a string' })
  platform: string;

  @ApiProperty({
    description: 'List of individual tests in the test run',
    type: [CreateTestDto],
  })
  @IsOptional()
  tests?: CreateTestDto[];
}
