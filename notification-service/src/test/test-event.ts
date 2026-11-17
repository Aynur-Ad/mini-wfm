import type { WorkOrderEvent } from '../notifications/work-order-event.js';
export const event: WorkOrderEvent = {
  eventId: '123e4567-e89b-42d3-a456-426614174000',
  correlationId: 'request-123',
  workOrderId: 12,
  workOrderCode: 'IE-2026-00012',
  teamId: 2,
  occurredAt: '2026-11-16T10:00:00Z',
  fromStatus: 'OPEN',
  toStatus: 'ASSIGNED',
  workforceUserIds: [3, 4, 3],
};
