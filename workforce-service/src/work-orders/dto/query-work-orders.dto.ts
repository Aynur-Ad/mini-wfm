import type {
  WorkOrderPriority,
  WorkOrderStatus,
} from '../work-order.enums.js';

export class QueryWorkOrdersDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkOrderStatus[];
  priority?: WorkOrderPriority;
  teamId?: number;
  overdue?: boolean;
  sortBy?: 'createdAt' | 'dueAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}