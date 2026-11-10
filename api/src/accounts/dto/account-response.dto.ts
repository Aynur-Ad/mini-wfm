import { ApiProperty } from '@nestjs/swagger';
import { AccountRole } from '../account-role.js';

export class AccountResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiProperty({ enum: AccountRole }) role: AccountRole;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class AccountsPageDto {
  @ApiProperty({ type: [AccountResponseDto] }) data: AccountResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}