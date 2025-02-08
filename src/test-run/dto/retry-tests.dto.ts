import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class RetryTestsDto {
  @ApiProperty({
    description: 'The ID of the test run that contains these executions',
    example: 'run-uuid-123',
  })
  @IsNotEmpty()
  @IsString()
  testRunId: string;

  @ApiProperty({
    description: 'Array of testExecution IDs that need to be retried',
    example: ['exec-uuid-1', 'exec-uuid-2'],
    isArray: true,
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  testExecutionIds: string[];
}
