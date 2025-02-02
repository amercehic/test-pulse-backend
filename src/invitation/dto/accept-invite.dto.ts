import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({
    example: 'f23a4d8c-89d2-4b6e-9f12-7bd1e0ab1f2c',
    description: 'Invitation token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'password123!',
    description: 'User-defined password',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
