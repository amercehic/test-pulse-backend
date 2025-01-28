import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';
import { CreateTestDto } from './create-test.dto';

export class CreateTestRunDto {
  @ApiProperty({ description: 'Name of the test run' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Triggered by (e.g., CI/CD)',
    example: 'CI/CD Pipeline',
  })
  @IsString()
  triggeredBy: string;

  @ApiProperty({ description: 'Status of the test run', example: 'passed' })
  @IsIn(['passed', 'failed'])
  status: 'passed' | 'failed';

  @ApiProperty({
    description: 'Total duration of the test run in seconds',
    example: 120,
  })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Commit hash associated with the test run' })
  @IsString()
  commit: string;

  @ApiProperty({ description: 'Branch name associated with the test run' })
  @IsString()
  branch: string;

  @ApiProperty({
    description: 'Framework used for the test run',
    example: 'Playwright',
  })
  @IsString()
  framework: string;

  @ApiProperty({
    description: 'Browser used for the test run',
    example: 'Chrome',
  })
  @IsString()
  browser: string;

  @ApiProperty({ description: 'Browser version', example: '96.0' })
  @IsString()
  browserVersion: string;

  @ApiProperty({
    description: 'Platform used for the test run',
    example: 'Windows',
  })
  @IsString()
  platform: string;

  @ApiProperty({
    description: 'List of individual tests in the test run',
    type: [CreateTestDto],
  })
  @IsOptional()
  tests?: CreateTestDto[];
}
