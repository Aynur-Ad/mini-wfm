// B10: Her servisin olay sözleşmesi kendi kodunda tutulur.
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
