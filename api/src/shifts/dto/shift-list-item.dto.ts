import { ApiProperty } from '@nestjs/swagger';
import { ShiftResponseDto } from './shift-response.dto.js';

export class ShiftTeamDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class ShiftPersonDto {
  @ApiProperty() id: number;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ type: ShiftTeamDto, nullable: true })
  team: ShiftTeamDto | null;
}

export class ShiftListItemDto extends ShiftResponseDto {
  @ApiProperty({ type: ShiftPersonDto }) workforceUser: ShiftPersonDto;
}