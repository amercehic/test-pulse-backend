import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EphemeralTestDto {
  @ApiProperty({
    example: 'Login works',
    description: 'Name of the ephemeral test',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Authentication', description: 'Suite name' })
  @IsOptional()
  @IsString()
  suite?: string;

  @ApiPropertyOptional({
    example: 'Check if user can login with valid credentials',
    description: 'Description of the ephemeral test',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

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
    example: 'Cypress',
    description: 'Framework used for the test run',
  })
  @IsNotEmpty()
  @IsString()
  framework: string;

  @ApiProperty({
    example: 'Chrome',
    description: 'Browser used for the test run',
  })
  @IsNotEmpty()
  @IsString()
  browser: string;

  @ApiProperty({
    example: '95.0',
    description: 'Browser version used for the test run',
  })
  @IsNotEmpty()
  @IsString()
  browserVersion: string;

  @ApiProperty({
    example: 'Ubuntu 20.04',
    description: 'Platform used for the test run',
  })
  @IsNotEmpty()
  @IsString()
  platform: string;

  @ApiPropertyOptional({
    type: [EphemeralTestDto],
    description: 'Optional array of ephemeral tests to automatically create',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EphemeralTestDto)
  tests?: EphemeralTestDto[];
}
