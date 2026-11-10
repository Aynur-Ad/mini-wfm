import { ApiProperty } from '@nestjs/swagger';
import { AccountRole } from '../../accounts/account-role.js';

export class AuthUserDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiProperty({ enum: AccountRole }) role: AccountRole;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Bearer token; loglara yazılmamalıdır' })
  accessToken: string;
  @ApiProperty({ description: 'Geçerlilik süresi, saniye', example: 28800 })
  expiresIn: number;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}