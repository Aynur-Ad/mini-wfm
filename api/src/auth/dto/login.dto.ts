import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsByteLength, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Kayıtlı kullanıcı adı' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'Kullanıcı adı metin olmalıdır' })
  @IsNotEmpty({ message: 'Kullanıcı adı boş olamaz' })
  @MaxLength(50, { message: 'Kullanıcı adı en fazla 50 karakter olmalıdır' })
  username: string;

  @ApiProperty({ description: 'Hesap şifresi', writeOnly: true })
  @IsString({ message: 'Şifre metin olmalıdır' })
  @IsNotEmpty({ message: 'Şifre boş olamaz' })
  @IsByteLength(0, 72, { message: 'Şifre en fazla 72 UTF-8 byte olmalıdır' })
  password: string;
}