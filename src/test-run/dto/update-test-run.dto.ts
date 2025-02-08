import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateTestRunDto {
  @ApiProperty({ description: 'Status of the test run', example: 'completed' })
  @IsOptional()
  @IsIn(['queued', 'running', 'completed', 'cancelled', 'failed'])
  status?: string;
}
