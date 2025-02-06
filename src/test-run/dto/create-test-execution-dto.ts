import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateTestExecutionDto {
  @ApiProperty({ description: 'Test ID associated with this execution' })
  @IsNotEmpty()
  @IsString()
  testId: string;

  @ApiProperty({ description: 'Test Run ID this execution belongs to' })
  @IsNotEmpty()
  @IsString()
  testRunId: string;

  @ApiProperty({ description: 'Attempt number for this execution', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  attempt: number;
}
