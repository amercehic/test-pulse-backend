import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString } from 'class-validator';

export class InviteUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email of the user to invite',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'admin',
    description: 'Role name assigned to the user (admin, viewer, member)',
  })
  @IsString()
  @IsIn(['admin', 'viewer', 'member'], { message: 'Invalid role name' })
  roleName: string;
}
