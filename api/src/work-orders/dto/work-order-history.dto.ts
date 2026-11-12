import { ApiProperty } from '@nestjs/swagger';
import { WorkOrderStatus } from '../work-order.enums.js';
export class HistoryAccountDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
}
export class WorkOrderHistoryDto {
  @ApiProperty() id: number;
  @ApiProperty() workOrderId: number;
  @ApiProperty({ enum: WorkOrderStatus, nullable: true })
  fromStatus: WorkOrderStatus | null;
  @ApiProperty({ enum: WorkOrderStatus }) toStatus: WorkOrderStatus;
  @ApiProperty({ type: Number, nullable: true }) teamId: number | null;
  @ApiProperty({ type: String, nullable: true, maxLength: 500 }) reason:
    string | null;
  @ApiProperty() changedById: number;
  @ApiProperty({ type: String, format: 'date-time' }) changedAt: string;
  @ApiProperty({ type: HistoryAccountDto }) changedBy: HistoryAccountDto;
}