import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsInt } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd', description: 'User password' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 1,
    description: 'Organization ID the user belongs to',
  })
  @IsInt()
  organizationId: number;
}
