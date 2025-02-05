import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID to assign the role to',
  })
  @IsNotEmpty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, {
    message: 'Invalid UUID format',
  })
  userId: string;

  @ApiProperty({ example: 'admin', description: 'Role name to assign' })
  @IsNotEmpty()
  @IsString()
  roleName: string;
}
