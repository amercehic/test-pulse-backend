import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TestQueryDto {
  @IsOptional()
  @IsString()
  status?: 'passed' | 'failed';

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sortBy?: string; // e.g., 'duration'

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
