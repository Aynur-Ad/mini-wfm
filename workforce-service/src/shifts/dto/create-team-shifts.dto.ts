// B10: TCP sözleşmesi serviste ayrı tutulur.
export class CreateTeamShiftsDto {
  teamId: number;
  startAt: string;
  endAt: string;
  note?: string | null;
}