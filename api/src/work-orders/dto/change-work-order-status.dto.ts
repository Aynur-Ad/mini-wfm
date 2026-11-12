import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { WorkOrderStatus } from '../work-order.enums.js';
export class ChangeWorkOrderStatusDto {
  @ApiProperty({
    minimum: 1,
    example: 1,
    description: 'Son GET yanıtındaki version; her başarılı değişimde artar',
  })
  @IsInt()
  @Min(1)
  version: number;
  @ApiProperty({ enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 1,
    description:
      'ASSIGNED hedefinde zorunlu; diğer hedeflerde ekip bu alanla değişmez',
  })
  @ValidateIf(
    (obj: ChangeWorkOrderStatusDto) =>
      obj.status === WorkOrderStatus.ASSIGNED ||
      (obj.teamId !== undefined && obj.teamId !== null),
  )
  @IsInt()
  @Min(1)
  teamId?: number | null;
  @ApiPropertyOptional({
    maxLength: 500,
    description: 'İptalde zorunlu; yalnız boşluk olamaz',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(
    (obj: ChangeWorkOrderStatusDto) =>
      obj.status === WorkOrderStatus.CANCELLED || obj.reason !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason?: string;
}