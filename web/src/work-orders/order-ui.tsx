import { useTranslation } from "../i18n/language";
import { Tag } from "antd";
import { priorityLabels, statusLabels } from "./work-orders";
import type { Priority, Status } from "./work-orders";

export function PriorityTag({ priority }: { priority: Priority }) {
  const t = useTranslation();
  return (
    <Tag className="order-chip" data-priority={priority}>
      {t(priorityLabels[priority])}
    </Tag>
  );
}

export function StatusTag({ status }: { status: Status }) {
  const t = useTranslation();
  return (
    <Tag className="order-chip" data-status={status}>
      {t(statusLabels[status])}
    </Tag>
  );
}
