import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

import { RoleEnum } from '../roles.enum';

export class AssignRoleDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;

  @ApiProperty({ example: RoleEnum.ADMIN, enum: RoleEnum })
  @IsNotEmpty({ message: 'Role name is required' })
  @IsEnum(RoleEnum, { message: 'Role name must be a valid enum value' })
  roleName: RoleEnum;
}
