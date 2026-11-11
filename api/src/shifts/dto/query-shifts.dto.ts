import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  Matches,
  Min,
  Validate,
  ValidatorConstraint,
} from 'class-validator';
import type {
  ValidationArguments,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'shiftQueryRange', async: false })
export class ShiftQueryRange implements ValidatorConstraintInterface {
  validate(to: unknown, args: ValidationArguments): boolean {
    const from: unknown = (args.object as { from?: unknown }).from;
    if (typeof from !== 'string' || typeof to !== 'string') return false;
    const duration = Date.parse(to) - Date.parse(from);
    return (
      Number.isFinite(duration) &&
      duration > 0 &&
      duration <= 31 * 24 * 60 * 60 * 1000
    );
  }
  defaultMessage(): string {
    return 'to, from tarihinden sonra olmalı; sorgu aralığı en fazla 31 gün olabilir';
  }
}

export class QueryShiftsDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Zorunlu başlangıç; ISO 8601 ve Z veya +03:00 gibi açık saat farkı',
  })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'from saat dilimi içermelidir',
  })
  from: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Zorunlu bitiş; from sonrasında ve en fazla 31 gün ileride. Bitiş anı aralığa dahil değildir.',
  })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'to saat dilimi içermelidir',
  })
  @Validate(ShiftQueryRange)
  to: string;

  @ApiPropertyOptional({
    minimum: 1,
    description: 'Personel filtresi; teamId ile birlikte kullanılabilir',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workforceUserId?: number;

  @ApiPropertyOptional({
    minimum: 1,
    description:
      'Personelin şu anki ekibi; vardiya tarihindeki ekip geçmişi tutulmaz',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teamId?: number;
}