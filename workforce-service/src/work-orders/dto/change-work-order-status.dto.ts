import type { WorkOrderStatus } from '../work-order.enums.js';
export class ChangeWorkOrderStatusDto {
  id: number;
  version: number;
  status: WorkOrderStatus;
  teamId?: number | null;
  reason?: string;
  // API'nin rol kontrolünde okuduğu durum; istemciden kabul edilmez.
  expectedStatus: WorkOrderStatus;
}