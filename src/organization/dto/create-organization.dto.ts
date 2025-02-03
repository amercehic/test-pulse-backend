import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Inc.', description: 'Organization name' })
  @IsNotEmpty({ message: 'Organization name is required' })
  @IsString({ message: 'Organization name must be a string' })
  name: string;
}
