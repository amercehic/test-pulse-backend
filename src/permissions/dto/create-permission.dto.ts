import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'view:test-run', description: 'Permission name' })
  @IsNotEmpty({ message: 'Permission name is required' })
  @IsString({ message: 'Permission name must be a string' })
  name: string;

  @ApiProperty({
    example: 'Allows viewing test runs',
    description: 'Permission description',
  })
  @IsNotEmpty({ message: 'Permission description is required' })
  @IsString({ message: 'Permission description must be a string' })
  description: string;
}
