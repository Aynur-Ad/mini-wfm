import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTeamDto } from './create-team.dto.js';

export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @ApiPropertyOptional({
    description: 'Ekibin aktiflik durumu (pasife almak için false gönderilir)',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Aktiflik durumu boolean (true/false) olmalıdır' })
  isActive?: boolean;
}