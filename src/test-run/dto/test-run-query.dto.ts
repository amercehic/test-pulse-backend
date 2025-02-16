import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { TestRunStatus } from '@/test-run/enums/test-status.enum';

export class TestRunQueryDto {
  @ApiPropertyOptional({
    description: 'Status of the test run',
    enum: TestRunStatus,
    example: TestRunStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(TestRunStatus)
  status?: TestRunStatus;

  @ApiPropertyOptional({
    description: 'Framework used for the test run.',
    example: 'Jest',
  })
  @IsOptional()
  @IsString()
  framework?: string;

  @ApiPropertyOptional({
    description: 'Browser used in the test run.',
    example: 'Chrome',
  })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({
    description: 'Platform on which the test run was executed.',
    example: 'Windows',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    description: 'Field by which to sort the test runs.',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Order of sorting. Can be either "asc" or "desc".',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Page number for pagination. Must be a positive integer.',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description:
      'Number of items per page for pagination. Must be a positive integer.',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
