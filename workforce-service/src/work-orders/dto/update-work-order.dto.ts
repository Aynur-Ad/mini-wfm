import type { WorkOrderPriority } from '../work-order.enums.js';
export class UpdateWorkOrderDto {
  id: number;
  title?: string;
  description?: string | null;
  priority?: WorkOrderPriority;
  dueAt?: string;
}