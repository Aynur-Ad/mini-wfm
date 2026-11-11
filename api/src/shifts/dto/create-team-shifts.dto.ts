import { OmitType } from '@nestjs/swagger';
import { CreateShiftDto } from './create-shift.dto.js';

// Üye ID'leri client'tan alınmaz; servis ekibin aktif üyelerini seçer.
export class CreateTeamShiftsDto extends OmitType(CreateShiftDto, [
  'workforceUserId',
] as const) {}