import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Inc.', description: 'Organization name' })
  @IsString()
  name: string;
}
