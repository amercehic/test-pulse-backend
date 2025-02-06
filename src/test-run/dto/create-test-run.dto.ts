import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTestRunDto {
  @ApiProperty({ description: 'Name of the test run' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Triggered by (e.g., CI/CD Pipeline)' })
  @IsNotEmpty()
  @IsString()
  triggeredBy: string;

  @ApiProperty({ description: 'Commit hash associated with the test run' })
  @IsNotEmpty()
  @IsString()
  commit: string;

  @ApiProperty({ description: 'Branch name associated with the test run' })
  @IsNotEmpty()
  @IsString()
  branch: string;

  @ApiProperty({
    description: 'Framework used for the test run',
    example: 'Playwright',
  })
  @IsNotEmpty()
  @IsString()
  framework: string;

  @ApiProperty({
    description: 'Browser used for the test run',
    example: 'Chrome',
  })
  @IsNotEmpty()
  @IsString()
  browser: string;

  @ApiProperty({
    description: 'Browser version used for the test run',
    example: '96.0',
  })
  @IsNotEmpty()
  @IsString()
  browserVersion: string;

  @ApiProperty({
    description: 'Platform used for the test run',
    example: 'Windows',
  })
  @IsNotEmpty()
  @IsString()
  platform: string;
}
