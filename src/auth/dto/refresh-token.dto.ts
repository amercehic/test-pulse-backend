import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'refresh_token_example',
    description: 'Refresh token',
  })
  @IsString()
  refreshToken: string;
}
