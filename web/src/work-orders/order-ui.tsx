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
  OPEN: "blue",
  ASSIGNED: "cyan",
  IN_PROGRESS: "orange",
  COMPLETED: "green",
  CANCELLED: "default",
};

export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <Tag className="order-chip" color={priorityColors[priority]}>
      {priorityLabels[priority]}
    </Tag>
  );
}

export function StatusTag({ status }: { status: Status }) {
  return (
    <Tag className="order-chip" color={statusColors[status]}>
      {statusLabels[status]}
    </Tag>
  );
}
