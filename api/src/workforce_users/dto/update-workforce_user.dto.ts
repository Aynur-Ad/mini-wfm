import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateWorkforceUserDto } from './create-workforce_user.dto.js';

export class UpdateWorkforceUserDto extends PartialType(
  CreateWorkforceUserDto,
  { skipNullProperties: false },
) {
  @ApiPropertyOptional({
    description: 'Personeli pasife almak için false gönderilir',
    example: false,
  })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean({ message: 'Aktiflik durumu boolean (true/false) olmalıdır' })
  isActive?: boolean;
}