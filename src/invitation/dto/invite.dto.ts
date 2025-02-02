import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt } from 'class-validator';

export class InviteUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email of the user to invite',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 2,
    description: 'ID of the role assigned to the user upon accepting',
  })
  @IsInt()
  roleId: number;
}
