import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTestDto {
  @IsOptional()
  id?: number; // Optional ID for updates

  @ApiProperty({ description: 'Name of the individual test' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Status of the test', example: 'passed' })
  @IsIn(['passed', 'failed'])
  status: 'passed' | 'failed';

  @ApiProperty({ description: 'Duration of the test in seconds', example: 30 })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Logs for the test' })
  @IsString()
  logs: string;
}
