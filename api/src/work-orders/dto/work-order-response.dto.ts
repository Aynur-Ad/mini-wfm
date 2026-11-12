import { ApiProperty } from '@nestjs/swagger';
import { WorkOrderPriority, WorkOrderStatus } from '../work-order.enums.js';
export class WorkOrderResponseDto {
  @ApiProperty() id: number;
  @ApiProperty({ example: 'IE-2026-00001' }) code: string;
  @ApiProperty() title: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ enum: WorkOrderPriority }) priority: WorkOrderPriority;
  @ApiProperty({ enum: WorkOrderStatus }) status: WorkOrderStatus;
  @ApiProperty({ type: Number, nullable: true }) teamId: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) dueAt: string;
  @ApiProperty() version: number;
  @ApiProperty() createdById: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}