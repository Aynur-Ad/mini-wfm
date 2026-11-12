import { ApiProperty } from '@nestjs/swagger';
import { WorkOrderResponseDto } from './work-order-response.dto.js';

export class WorkOrderTeamDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class WorkOrderListItemDto extends WorkOrderResponseDto {
  @ApiProperty({ type: () => WorkOrderTeamDto, nullable: true })
  team: WorkOrderTeamDto | null;
  @ApiProperty({ description: 'Son tarihi geçmiş ve kapanmamış iş emri' })
  isOverdue: boolean;
}

export class WorkOrderListDto {
  @ApiProperty({ type: () => WorkOrderListItemDto, isArray: true })
  data: WorkOrderListItemDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}