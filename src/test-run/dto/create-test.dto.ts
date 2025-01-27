import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';

export class CreateTestDto {
  @IsOptional()
  id?: number; // Optional ID for updates

  @IsString()
  name: string;

  @IsIn(['passed', 'failed'])
  status: 'passed' | 'failed';

  @IsNumber()
  duration: number;

  @IsString()
  logs: string;
}
