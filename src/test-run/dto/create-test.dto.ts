import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTestDto {
  @ApiProperty({
    description: 'Test name',
    example: 'Login with valid credentials',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Test suite name', example: 'Authentication' })
  @IsOptional()
  @IsString()
  suite?: string;

  @ApiProperty({
    description: 'Test description',
    example: 'Ensure login works with correct credentials',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
