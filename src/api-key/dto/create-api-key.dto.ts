import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name/description for the API key',
    example: 'CI Pipeline Key',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name: string;
}
