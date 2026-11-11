// B10: API'den import edilmez; servisin kendi TCP sözleşmesidir.
export class QueryShiftsDto {
  from: string;
  to: string;
  workforceUserId?: number;
  teamId?: number;
}