import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: '468691a7-d6c1-4f70-a9ea-9872c79650d8' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'f1c2d3e4-5678-9abc-def0-123456789abc' })
  @IsUUID()
  roleId: string;
}
