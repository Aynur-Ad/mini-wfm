import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { WorkOrderPriority } from '../work-order.enums.js';
export class CreateWorkOrderDto {
  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
  @ApiPropertyOptional({
    enum: WorkOrderPriority,
    default: WorkOrderPriority.MEDIUM,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Z veya açık saat farkı içeren ISO 8601; geçmişte olamaz',
  })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'dueAt saat dilimi içermelidir',
  })
  dueAt: string;
}