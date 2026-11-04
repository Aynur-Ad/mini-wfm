import { ApiProperty, OmitType } from '@nestjs/swagger';
import { WorkforceUserResponseDto } from '../../workforce_users/dto/workforce_user-response.dto.js';

// Üyede teamId bulunur; üstteki ekip tekrar üyeye gömülmez.
export class TeamMemberResponseDto extends OmitType(WorkforceUserResponseDto, [
  'team',
] as const) {}

export class TeamDetailResponseDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 'Backend Ekibi' })
  name: string;
  @ApiProperty({ type: String, nullable: true })
  description: string | null;
  @ApiProperty({ example: true })
  isActive: boolean;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
  @ApiProperty({
    type: [TeamMemberResponseDto],
    description: 'Ekibin aktif ve pasif tüm üyeleri; üye yoksa boş dizi',
  })
  members: TeamMemberResponseDto[];
}