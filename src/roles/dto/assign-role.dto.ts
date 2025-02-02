import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 1, description: 'User ID to assign the role to' })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 2, description: 'Role ID to assign' })
  @IsInt()
  roleId: number;
}
