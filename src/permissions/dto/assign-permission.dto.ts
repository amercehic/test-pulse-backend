import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class AssignPermissionDto {
  @ApiProperty({
    example: 1,
    description: 'User ID to assign the permission to',
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsInt({ message: 'User ID must be an integer' })
  userId: number;

  @ApiProperty({ example: 3, description: 'Permission ID to assign' })
  @IsNotEmpty({ message: 'Permission ID is required' })
  @IsInt({ message: 'Permission ID must be an integer' })
  permissionId: number;
}
