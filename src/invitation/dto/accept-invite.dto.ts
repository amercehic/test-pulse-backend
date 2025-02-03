import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({
    example: 'f23a4d8c-89d2-4b6e-9f12-7bd1e0ab1f2c',
    description: 'Invitation token',
  })
  @IsNotEmpty({ message: 'Invitation token is required' })
  @IsString({ message: 'Invitation token must be a string' })
  token: string;

  @ApiProperty({
    example: 'password123!',
    description: 'User-defined password',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
