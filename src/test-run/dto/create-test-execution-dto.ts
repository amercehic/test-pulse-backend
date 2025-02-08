import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateTestExecutionDto {
  @ApiProperty({ description: 'Test Run ID this execution belongs to' })
  @IsNotEmpty()
  @IsString()
  testRunId: string;

  @ApiProperty({
    description: 'Name of the ephemeral test',
    example: 'Login works',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Suite name', example: 'Authentication' })
  @IsOptional()
  @IsString()
  suite?: string;

  @ApiPropertyOptional({
    description: 'Description of the ephemeral test',
    example: 'Ensure login fails with incorrect credentials',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Attempt number for this execution', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  attempt: number;
}
