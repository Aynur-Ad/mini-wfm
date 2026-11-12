import type { WorkOrderPriority } from '../work-order.enums.js';
export class CreateWorkOrderDto {
  title: string;
  description?: string | null;
  priority?: WorkOrderPriority;
  dueAt: string;
}