import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TestQueryDto {
  @ApiPropertyOptional({
    description: 'Status of the test. Can be either "passed" or "failed".',
    enum: ['passed', 'failed'],
    example: 'passed',
  })
  @IsOptional()
  @IsString()
  status?: 'passed' | 'failed';

  @ApiPropertyOptional({
    description: 'Name of the test.',
    example: 'Authentication Test',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Field by which to sort the results.',
    example: 'duration',
  })
  @IsOptional()
  @IsString()
  sortBy?: string; // e.g., 'duration'

  @ApiPropertyOptional({
    description: 'Order of sorting. Can be either "ASC" or "DESC".',
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Page number for pagination. Must be a positive integer.',
    example: 1,
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
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
