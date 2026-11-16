import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
export class RotationSlotDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @ApiProperty({ example: '08:00' })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;
  @ApiProperty({ example: '16:00' })
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/)
  endTime: string;
  @ApiProperty({ minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  requiredCount: number;
}
export class RotationPlanDto {
  @ApiProperty({ example: '2026-11-23' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  startDate: string;
  @ApiProperty({ minimum: 1, maximum: 14 })
  @IsInt()
  @Min(1)
  @Max(14)
  days: number;
  @ApiProperty({ type: [RotationSlotDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => RotationSlotDto)
  slots: RotationSlotDto[];
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  apply: boolean = false;
}
export class RotationAssignmentDto {
  @ApiProperty() date: string;
  @ApiProperty() slot: string;
  @ApiProperty() workforceUserId: number;
  @ApiProperty() registrationNumber: string;
  @ApiProperty() startAt: string;
  @ApiProperty() endAt: string;
}
export class RotationTotalDto {
  @ApiProperty() workforceUserId: number;
  @ApiProperty() registrationNumber: string;
  @ApiProperty() minutes: number;
  @ApiProperty() hours: number;
}
export class UnfilledSlotDto {
  @ApiProperty() date: string;
  @ApiProperty() slot: string;
  @ApiProperty() missing: number;
  @ApiProperty({ type: [String] }) reasonCodes: string[];
}
export class RotationPlanResponseDto {
  @ApiProperty({ type: [RotationAssignmentDto] })
  assignments: RotationAssignmentDto[];
  @ApiProperty({ type: [RotationTotalDto] }) totals: RotationTotalDto[];
  @ApiProperty({ type: [UnfilledSlotDto] }) unfilled: UnfilledSlotDto[];
  @ApiProperty() fairnessHours: number;
  @ApiProperty() applied: boolean;
}