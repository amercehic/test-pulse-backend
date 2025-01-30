import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignPermissionDto {
  @ApiProperty({
    example: 1,
    description: 'User ID to assign the permission to',
  })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 3, description: 'Permission ID to assign' })
  @IsInt()
  permissionId: number;
}
