import dayjs from "dayjs";
import type { AccountRole } from "../auth/use-session";

export const statusLabels = {
  OPEN: "Açık",
  ASSIGNED: "Atandı",
  IN_PROGRESS: "Devam ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal edildi",
} as const;

export const priorityLabels = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  URGENT: "Acil",
} as const;

export type Status = keyof typeof statusLabels;
export type Priority = keyof typeof priorityLabels;

export interface WorkOrderInput {
  title: string;
  description: string | null;
  priority: Priority;
  dueAt: string;
}

export interface WorkOrder extends WorkOrderInput {
  id: number;
  code: string;
  status: Status;
  teamId: number | null;
  version: number;
}

export interface WorkOrderListItem extends WorkOrder {
  team: { id: number; name: string } | null;
  isOverdue: boolean;
}

export interface HistoryEntry {
  id: number;
  fromStatus: Status | null;
  toStatus: Status;
  teamId: number | null;
  reason: string | null;
  changedAt: string;
  changedBy: { id: number; username: string };
}

export interface Filters {
  page: number;
  limit: number;
  search?: string;
  status?: Status[];
  priority?: Priority;
  teamId?: number;
  overdue?: boolean;
}

export const actionLabels: Record<Status, string> = {
  OPEN: "Atamayı kaldır",
  ASSIGNED: "Ata",
  IN_PROGRESS: "Çalışmayı başlat",
  COMPLETED: "Tamamla",
  CANCELLED: "İptal Et",
};

// API'deki B19 geçişleri. Yetkiyi ve veriyi sunucu tekrar denetler.
const transitions: Record<Status, readonly Status[]> = {
  OPEN: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "OPEN", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canWriteOrders(role?: AccountRole) {
  return role === "ADMIN" || role === "PLANNER";
}

export function allowedTransitions(status: Status, role?: AccountRole) {
  if (!canWriteOrders(role)) return [];
  if (status === "IN_PROGRESS" && role !== "ADMIN")
    return ["COMPLETED"] as const;
  return transitions[status];
}

export function filtersToParams(filters: Filters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  for (const status of filters.status ?? []) params.append("status", status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.teamId !== undefined)
    params.set("teamId", String(filters.teamId));
  if (filters.overdue) params.set("overdue", "true");
  return params;
}

export const priorityOptions = (Object.keys(priorityLabels) as Priority[]).map(
  (value) => ({ value, label: priorityLabels[value] }),
);
export const statusOptions = (Object.keys(statusLabels) as Status[]).map(
  (value) => ({ value, label: statusLabels[value] }),
);

export function displayDate(value: string) {
  return dayjs(value).format("DD.MM.YYYY HH:mm");
}
