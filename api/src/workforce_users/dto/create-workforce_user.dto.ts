import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateWorkforceUserDto {
  @ApiProperty({
    description: 'Personelin adı (zorunlu, en fazla 100 karakter)',
    example: 'Salih',
    maxLength: 100,
  })
  @IsString({ message: 'Ad metin (string) olmalıdır' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'Ad boş bırakılamaz' })
  @MaxLength(100, { message: 'Ad en fazla 100 karakter olabilir' })
  firstName: string;

  @ApiProperty({
    description: 'Personelin soyadı (zorunlu, en fazla 100 karakter)',
    example: 'Birinci',
    maxLength: 100,
  })
  @IsString({ message: 'Soyad metin (string) olmalıdır' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'Soyad boş bırakılamaz' })
  @MaxLength(100, { message: 'Soyad en fazla 100 karakter olabilir' })
  lastName: string;

  @ApiProperty({
    description:
      'Personelin benzersiz sicil numarası (zorunlu, en fazla 20 karakter) ',
    example: '151413',
    maxLength: 20,
  })
  @IsString({ message: 'Sicil numarası metin (string) olmalıdır ' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'Sicil numarası boş bırakılamaz' })
  @MaxLength(20, { message: 'Sicil numarası en fazla 20 karakter olabilir' })
  registrationNumber: string;

  @ApiPropertyOptional({
    description:
      'Opsiyonel telefon; gönderilirse 5 ile başlayan tam 10 rakam. null ile boşaltılabilir.',
    example: '5551234567',
    type: String,
    nullable: true,
    minLength: 10,
    maxLength: 10,
    pattern: '^5[0-9]{9}$',
  })
  @IsOptional()
  @IsString({ message: 'Telefon numarası metin (string) olmalıdır' })
  @Matches(/^5[0-9]{9}$/, {
    message: 'Telefon numarası 10 haneli olmalıdır ve 5 ile başlamalıdır',
  })
  phone?: string | null;
}
