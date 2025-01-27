import { IsString, IsIn, IsNumber } from 'class-validator';

export class CreateTestDto {
  @IsString()
  name: string;

  @IsIn(['passed', 'failed'])
  status: 'passed' | 'failed';

  @IsNumber()
  duration: number;

  @IsString()
  logs: string;
}
