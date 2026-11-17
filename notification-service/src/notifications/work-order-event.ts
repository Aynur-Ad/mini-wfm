// B10: olay sözleşmesi yayıncıdan bağımsız tanımlanır.
export interface WorkOrderEvent {
  eventId: string;
  correlationId: string;
  workOrderId: number;
  workOrderCode: string;
  teamId: number | null;
  occurredAt: string;
  fromStatus: string;
  toStatus: string;
  workforceUserIds: number[];
}
