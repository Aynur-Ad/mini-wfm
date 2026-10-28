import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class CreateWorkforceUserDto {
  @ApiProperty({
    description: 'Personelin adı (zorunlu, en fazla 100 karakter)',
    example: 'Salih',
    maxLength: 100,
  })
  @IsString({ message: 'Ad metin (string) olmalıdır' })
  @IsNotEmpty({ message: 'Ad boş bırakılamaz' })
  @MaxLength(100, { message: 'Ad en fazla 100 karakter olabilir' })
  firstName: string;

  @ApiProperty({
    description: 'Personelin soyadı (zorunlu, en fazla 100 karakter)',
    example: 'Birinci',
    maxLength: 100,
  })
  @IsString({ message: 'Soyad metin (string) olmalıdır' })
  @IsNotEmpty({ message: 'Soyad boş bırakılamaz' })
  @MaxLength(100, { message: 'Soyad en fazla 100 karakter olabilir' })
  lastName: string;

  @ApiProperty({
    description: 'Personelin benzersiz sicil numarası (zorunlu, en fazla 20 karakter) ',
    example: '151413',
    maxLength: 20,
  })
  @IsString({ message: 'Sicil numarası metin (string) olmalıdır ' })
  @IsNotEmpty({ message: 'Sicil numarası boş bırakılamaz' })
  @MaxLength(20, { message: 'Sicil numarası en fazla 20 karakter olabilir' })
  registrationNumber: string;

  @ApiPropertyOptional({
    description:
      'Personelin telefon numarası (opsiyonel, en fazla 10 karakter)',
    example: '5551234567',
    maxLength: 10,
  })
  @IsOptional()
  @IsString({ message: 'Telefon numarası metin (string) olmalıdır' })
  @Matches(/^5[0-9]{9}$/, {
    message: 'Telefon numarası 10 haneli olmalıdır ve 5 ile başlamalıdır',
  })
  phone?: string;
}
