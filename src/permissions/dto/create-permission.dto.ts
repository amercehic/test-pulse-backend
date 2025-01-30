import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'view:test-run', description: 'Permission name' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Allows viewing test runs',
    description: 'Permission description',
  })
  @IsString()
  description: string;
}
