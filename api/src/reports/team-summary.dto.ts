import { ApiProperty } from '@nestjs/swagger';

class WorkOrderCountsDto {
  @ApiProperty()
  OPEN: number;

  @ApiProperty()
  ASSIGNED: number;

  @ApiProperty()
  IN_PROGRESS: number;

  @ApiProperty()
  COMPLETED: number;

  @ApiProperty()
  CANCELLED: number;
}

export class TeamSummaryDto {
  @ApiProperty()
  teamId: number;

  @ApiProperty()
  teamName: string;

  @ApiProperty()
  activeMemberCount: number;

  @ApiProperty({ type: WorkOrderCountsDto })
  workOrderCounts: WorkOrderCountsDto;

  @ApiProperty({
    description: 'Son tarihi geçmiş ve henüz kapanmamış iş emirleri',
  })
  overdueWorkOrderCount: number;

  @ApiProperty({
    description:
      'Vardiyaların istenen aralıkla kesişen toplam süresi, saat olarak',
  })
  totalShiftHours: number;
}
