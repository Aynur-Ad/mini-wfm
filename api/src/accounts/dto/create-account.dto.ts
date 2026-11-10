import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { AccountRole } from '../account-role.js';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Kullanıcı adı; küçük harfle saklanır',
    maxLength: 50,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'Kullanıcı adı metin olmalıdır' })
  @IsNotEmpty({ message: 'Kullanıcı adı boş olamaz' })
  @MaxLength(50, { message: 'Kullanıcı adı en fazla 50 karakter olmalıdır' })
  username: string;

  @ApiProperty({
    description:
      'En az 8 karakter, en fazla 72 UTF-8 byte; yalnızca istek alanıdır',
    minLength: 8,
    writeOnly: true,
  })
  @IsString({ message: 'Şifre metin olmalıdır' })
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @Matches(/\S/, { message: 'Şifre yalnızca boşluklardan oluşamaz' })
  @IsByteLength(0, 72, { message: 'Şifre en fazla 72 UTF-8 byte olmalıdır' })
  password: string;

  @ApiProperty({ enum: AccountRole })
  @IsEnum(AccountRole, { message: 'Rol ADMIN, PLANNER veya VIEWER olmalıdır' })
  role: AccountRole;
}