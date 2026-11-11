import { PartialType } from '@nestjs/swagger';
import { CreateShiftDto } from './create-shift.dto.js';

// Yalnızca note null ile temizlenebilir; diğer alanlarda null kabul edilmez.
export class UpdateShiftDto extends PartialType(CreateShiftDto, {
  skipNullProperties: false,
}) {}