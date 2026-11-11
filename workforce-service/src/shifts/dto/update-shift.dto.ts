export class UpdateShiftDto {
  id: number;
  workforceUserId?: number;
  startAt?: string;
  endAt?: string;
  note?: string | null;
}