import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { TestRunStatus } from '@/test-run/enums/test-status.enum';

export class UpdateTestRunDto {
  @ApiProperty({
    description: 'Status of the test run',
    enum: TestRunStatus,
    example: TestRunStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(TestRunStatus)
  status?: TestRunStatus;
}
