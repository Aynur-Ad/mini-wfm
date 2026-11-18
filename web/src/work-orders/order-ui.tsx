import { Tag } from "antd";
import { priorityLabels, statusLabels } from "./work-orders";
import type { Priority, Status } from "./work-orders";

const priorityColors: Record<Priority, string> = {
  LOW: "green",
  MEDIUM: "gold",
  HIGH: "orange",
  URGENT: "volcano",
};
const statusColors: Record<Status, string> = {
  OPEN: "default",
  ASSIGNED: "green",
  IN_PROGRESS: "orange",
  COMPLETED: "success",
  CANCELLED: "default",
};

export function PriorityTag({ priority }: { priority: Priority }) {
  return <Tag color={priorityColors[priority]}>{priorityLabels[priority]}</Tag>;
}

export function StatusTag({ status }: { status: Status }) {
  return <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>;
}
