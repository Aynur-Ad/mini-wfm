import { ApiProperty } from '@nestjs/swagger';
export class NotificationResponseDto {
  @ApiProperty() id: number;
  @ApiProperty({ format: 'uuid' }) eventId: string;
  @ApiProperty() type: string;
  @ApiProperty() workforceUserId: number;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}
export class NotificationListDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
