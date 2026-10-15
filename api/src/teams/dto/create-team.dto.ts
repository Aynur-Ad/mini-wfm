import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    description: 'Ekibin benzersiz adı (zorunlu, en fazla 200 karakter)',
    example: 'Backend Geliştirme Ekibi',
    maxLength: 200,
  })
  @IsString({ message: 'Ekip adı metin (string) olmalıdır' })
  @IsNotEmpty({ message: 'Ekip adı boş bırakılamaz' })
  @MaxLength(200, { message: 'Ekip adı en fazla 200 karakter olabilir' })
  name: string;

  @ApiPropertyOptional({
    description: 'Ekibin görev tanımı ve açıklaması (opsiyonel)',
    example: 'Mikroservislerin geliştirilmesinden sorumlu ekip',
  })
  @IsOptional()
  @IsString({ message: 'Açıklama metin (string) olmalıdır' })
  description?: string;
}
