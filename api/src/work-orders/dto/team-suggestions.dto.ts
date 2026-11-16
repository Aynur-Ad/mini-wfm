import { ApiProperty } from '@nestjs/swagger';
export class TeamScorePartDto {
  @ApiProperty() metric: string;
  @ApiProperty() value: number;
  @ApiProperty() weight: number;
  @ApiProperty() points: number;
}
export class TeamSuggestionDto {
  @ApiProperty() teamId: number;
  @ApiProperty() name: string;
  @ApiProperty() capacityHours: number;
  @ApiProperty() openWorkOrders: number;
  @ApiProperty() overdueWorkOrders: number;
  @ApiProperty() score: number;
  @ApiProperty({ type: [TeamScorePartDto] }) breakdown: TeamScorePartDto[];
}
export class ExcludedTeamDto {
  @ApiProperty() teamId: number;
  @ApiProperty() name: string;
  @ApiProperty({ example: 'NO_CAPACITY' }) reason: string;
}
export class TeamSuggestionsDto {
  @ApiProperty({ type: [TeamSuggestionDto] }) suggestions: TeamSuggestionDto[];
  @ApiProperty({ type: [ExcludedTeamDto] }) excluded: ExcludedTeamDto[];
}
