import { ApiProperty } from '@nestjs/swagger';

export class TeamSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 'Backend Ekibi' })
  name: string;
}

export class WorkforceUserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 'Deniz' })
  firstName: string;
  @ApiProperty({ example: 'Kaya' })
  lastName: string;
  @ApiProperty({ example: 'P1001' })
  registrationNumber: string;
  @ApiProperty({ type: String, nullable: true, example: '5321234567' })
  phone: string | null;
  @ApiProperty({ example: true })
  isActive: boolean;
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1,
    description: 'Atanmamış personelde null',
  })
  teamId: number | null;
  @ApiProperty({
    type: () => TeamSummaryDto,
    nullable: true,
    description: 'Ekibin ID ve adı; atanmamış personelde null',
  })
  team: TeamSummaryDto | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}

export class WorkforceUsersPageDto {
  @ApiProperty({ type: [WorkforceUserResponseDto] })
  data: WorkforceUserResponseDto[];
  @ApiProperty({
    description: 'Filtreye uyan tüm kayıtların sayısı',
    example: 25,
  })
  total: number;
  @ApiProperty({ example: 1 })
  page: number;
  @ApiProperty({ example: 10 })
  limit: number;
}