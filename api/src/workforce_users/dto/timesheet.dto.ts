import { ApiProperty } from '@nestjs/swagger';
export class TimesheetMinutesDto {
  @ApiProperty() total: number;
  @ApiProperty() night: number;
  @ApiProperty() holiday: number;
  @ApiProperty() weekend: number;
  @ApiProperty() overtime: number;
}
export class TimesheetDayDto extends TimesheetMinutesDto {
  @ApiProperty() date: string;
}
export class TimesheetWeekDto {
  @ApiProperty() weekStart: string;
  @ApiProperty() total: number;
  @ApiProperty() overtime: number;
  @ApiProperty() monthTotal: number;
  @ApiProperty() monthOvertime: number;
}
export class TimesheetDto {
  @ApiProperty() month: string;
  @ApiProperty({ type: [TimesheetDayDto] }) days: TimesheetDayDto[];
  @ApiProperty({ type: [TimesheetWeekDto] }) weeks: TimesheetWeekDto[];
  @ApiProperty({ type: TimesheetMinutesDto }) totals: TimesheetMinutesDto;
}