import { IsString, IsArray, IsOptional, IsIn, IsNumber } from 'class-validator';
import { CreateTestDto } from './create-test.dto';


export class CreateTestRunDto {
  @IsString()
  name: string;

  @IsString()
  triggeredBy: string;

  @IsIn(['passed', 'failed'])
  status: 'passed' | 'failed';

  @IsNumber()
  duration: number;

  @IsString()
  commit: string;

  @IsString()
  branch: string;

  @IsString()
  framework: string;

  @IsString()
  browser: string;

  @IsString()
  browserVersion: string;

  @IsString()
  platform: string;

  @IsArray()
  @IsOptional()
  tests?: CreateTestDto[];
}
