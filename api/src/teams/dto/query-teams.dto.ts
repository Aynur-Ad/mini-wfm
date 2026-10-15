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

export class QueryTeamsDto {
  @ApiPropertyOptional({
    description: 'Sayfa numarası (en az 1)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number) // Query string'den gelen metni sayıya çevirir
  @IsInt({ message: 'Sayfa numarası tam sayı olmalıdır' })
  @Min(1, { message: 'Sayfa numarası en az 1 olmalıdır' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Sayfa başına kayıt sayısı (1 ile 100 arası)',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number) // Query string'den gelen metni sayıya çevirir
  @IsInt({ message: 'Limit tam sayı olmalıdır' })
  @Min(1, { message: 'Limit en az 1 olmalıdır' })
  @Max(100, { message: 'Limit en fazla 100 olabilir' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Ekip adında büyük/küçük harf duyarsız arama metni',
    example: 'Backend',
  })
  @IsOptional()
  @IsString({ message: 'Arama metni string olmalıdır' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Aktiflik durumuna göre filtreleme (true veya false)',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value; // Geçersiz bir metin girilirse @IsBoolean hataya düşürsün diye olduğu gibi bırakıyoruz
  })
  @IsBoolean({ message: 'isActive alanı true veya false olmalıdır' })
  isActive?: boolean;
}
