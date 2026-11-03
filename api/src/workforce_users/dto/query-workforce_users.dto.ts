import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryWorkforceUsersDto {
  @ApiPropertyOptional({
    description: 'Sayfa numarası',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sayfa numarası tam sayı olmalıdır' })
  @Min(1, { message: 'Sayfa numarası en az 1 olmalıdır' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Sayfa başına kayıt sayısı',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit tam sayı olmalıdır' })
  @Min(1, { message: 'Limit en az 1 olmalıdır' })
  @Max(100, { message: 'Limit en fazla 100 olabilir' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description:
      'Ad, soyad veya sicil numarasında büyük/küçük harf duyarsız arama',
    example: 'Deniz',
  })
  @IsOptional()
  @IsString({ message: 'Arama metni metin (string) olmalıdır' })
  search?: string;

  @ApiPropertyOptional({ description: 'Aktiflik filtresi', type: Boolean })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'Aktiflik filtresi true veya false olmalıdır' })
  isActive?: boolean;
}