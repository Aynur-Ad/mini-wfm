import { http } from "../api/http";
import { getTeams } from "../api/teams.api";
import type { PaginatedResponse, Team } from "../types";
import { filtersToParams } from "./work-orders";
import type {
  Filters,
  HistoryEntry,
  Status,
  WorkOrder,
  WorkOrderInput,
  WorkOrderListItem,
} from "./work-orders";

export const ordersKey = ["work-orders"];
export const orderKey = (id: number) => [...ordersKey, id];
export const historyKey = (id: number) => [...orderKey(id), "history"];
export const listKey = (filters: Filters) => [...ordersKey, "list", filters];

export async function listWorkOrders(filters: Filters, signal?: AbortSignal) {
  return (
    await http.get<PaginatedResponse<WorkOrderListItem>>("/work-orders", {
      params: filtersToParams(filters),
      signal,
    })
  ).data;
}

export async function getWorkOrder(id: number, signal?: AbortSignal) {
  return (await http.get<WorkOrder>(`/work-orders/${id}`, { signal })).data;
}

export async function getWorkOrderHistory(id: number, signal?: AbortSignal) {
  return (
    await http.get<HistoryEntry[]>(`/work-orders/${id}/history`, { signal })
  ).data;
}

export async function createWorkOrder(input: WorkOrderInput) {
  return (await http.post<WorkOrder>("/work-orders", input)).data;
}

export async function updateWorkOrder(
  id: number,
  version: number,
  input: Partial<WorkOrderInput>,
) {
  return (
    await http.patch<WorkOrder>(`/work-orders/${id}`, { ...input, version })
  ).data;
}

export async function changeWorkOrderStatus(
  id: number,
  version: number,
  status: Status,
  details: { teamId?: number; reason?: string },
) {
  return (
    await http.patch<WorkOrder>(`/work-orders/${id}/status`, {
      version,
      status,
      ...details,
    })
  ).data;
}

export async function getOrderTeams() {
  const teams: Team[] = [];
  for (let page = 1; ; page++) {
    const result = await getTeams({ page, limit: 100 });
    teams.push(...result.data);
    if (teams.length >= result.total || result.data.length === 0) return teams;
  }
}
