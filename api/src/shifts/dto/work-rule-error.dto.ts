import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class WorkRuleShiftDto {
  @ApiPropertyOptional() id?: number;
  @ApiProperty() workforceUserId: number;
  @ApiProperty({ type: String, format: 'date-time' }) startAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) endAt: string;
  @ApiProperty({ enum: ['existing', 'new'] }) source: string;
}
export class WorkRuleViolationDto {
  @ApiProperty({ enum: ['REST', 'WEEKLY_LIMIT', 'CONSECUTIVE_DAYS'] })
  code: string;
  @ApiProperty() workforceUserId: number;
  @ApiProperty({ type: [WorkRuleShiftDto] }) shifts: WorkRuleShiftDto[];
  @ApiProperty({ example: 6 }) value: number;
  @ApiProperty({ example: 11 }) limit: number;
  @ApiProperty({ enum: ['hours', 'days'] }) unit: string;
  @ApiProperty({ example: 'Dinlenme süresi 6 saat; en az 11 saat olmalıdır' })
  message: string;
  @ApiPropertyOptional() actualMinutes?: number;
  @ApiPropertyOptional() limitMinutes?: number;
  @ApiPropertyOptional({ example: '2035-01-01' }) weekStart?: string;
  @ApiPropertyOptional() fromDate?: string;
  @ApiPropertyOptional() toDate?: string;
  @ApiPropertyOptional() registrationNumber?: string;
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() lastName?: string;
}
export class WorkRuleErrorDto {
  @ApiProperty({ example: 409 }) statusCode: number;
  @ApiProperty({ example: 'Vardiya çalışma kurallarına uymuyor' })
  message: string;
  @ApiPropertyOptional({ type: [WorkRuleViolationDto] })
  details?: WorkRuleViolationDto[];
}