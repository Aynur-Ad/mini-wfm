import { ApiProperty } from '@nestjs/swagger';

export class ShiftResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() workforceUserId: number;
  @ApiProperty({ type: String, format: 'date-time' }) startAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) endAt: string;
  @ApiProperty({ type: String, nullable: true, maxLength: 500 }) note:
    string | null;
  @ApiProperty() createdById: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}