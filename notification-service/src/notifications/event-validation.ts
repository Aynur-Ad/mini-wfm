import type { WorkOrderEvent } from './work-order-event.js';
export class InvalidEventError extends Error {}
export function readEvent(
  value: unknown,
  assigned: boolean | 'overdue',
): WorkOrderEvent {
  const e = value as Partial<WorkOrderEvent> | null;
  const id = (v: unknown) =>
    typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 2147483647;
  const states = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (
    !e ||
    typeof e !== 'object' ||
    typeof e.eventId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      e.eventId,
    ) ||
    !id(e.workOrderId) ||
    typeof e.workOrderCode !== 'string' ||
    !/^IE-\d{4}-\d{5,10}$/.test(e.workOrderCode) ||
    !(e.teamId === null || id(e.teamId)) ||
    typeof e.occurredAt !== 'string' ||
    !Number.isFinite(Date.parse(e.occurredAt)) ||
    typeof e.correlationId !== 'string' ||
    !/^[A-Za-z0-9._:-]{1,128}$/.test(e.correlationId) ||
    !states.includes(e.fromStatus ?? '') ||
    !states.includes(e.toStatus ?? '') ||
    !Array.isArray(e.workforceUserIds) ||
    !e.workforceUserIds.every(id) ||
    (assigned === true && (e.toStatus !== 'ASSIGNED' || !id(e.teamId))) ||
    (assigned === 'overdue' &&
      (e.fromStatus !== e.toStatus ||
        ['COMPLETED', 'CANCELLED'].includes(e.toStatus ?? '')))
  )
    throw new InvalidEventError('Geçersiz iş emri olayı');
  return e as WorkOrderEvent;
}
