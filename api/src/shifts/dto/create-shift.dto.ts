import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateShiftDto {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  workforceUserId: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'ISO 8601; Z veya açık saat farkı zorunlu. Örnek: 2027-01-12T08:00:00+03:00',
  })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'startAt saat dilimi içermelidir (Z veya +03:00 gibi)',
  })
  startAt: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Başlangıçtan 1–12 saat sonra; ISO 8601 ve açık saat dilimi',
  })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'endAt saat dilimi içermelidir (Z veya +03:00 gibi)',
  })
  endAt: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}