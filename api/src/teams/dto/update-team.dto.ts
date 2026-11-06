import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateTeamDto } from './create-team.dto.js';

export class UpdateTeamDto extends PartialType(CreateTeamDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional({
    description: 'Ekibin aktiflik durumu (pasife almak için false gönderilir)',
    example: true,
  })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean({ message: 'Aktiflik durumu boolean (true/false) olmalıdır' })
  isActive?: boolean;
}