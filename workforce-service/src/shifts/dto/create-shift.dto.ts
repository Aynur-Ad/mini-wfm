// B10: TCP sözleşmesi servisin kendi dosyasında tutulur; API'den import edilmez.
export class CreateShiftDto {
  workforceUserId: number;
  startAt: string;
  endAt: string;
  note?: string | null;
}