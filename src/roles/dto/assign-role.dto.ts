// src/roles/dto/assign-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { RoleEnum } from '../roles.enum';

export class AssignRoleDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: RoleEnum.ADMIN, enum: RoleEnum })
  @IsEnum(RoleEnum)
  roleName: RoleEnum;
}
