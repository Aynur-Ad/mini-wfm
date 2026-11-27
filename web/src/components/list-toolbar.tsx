import { Button } from "antd";
import { ColumnHeightOutlined } from "@ant-design/icons";
import { useTranslation } from "../i18n/language";
export function ListToolbar({
  total,
  compact,
  toggle,
}: {
  total?: number;
  compact: boolean;
  toggle: () => void;
}) {
  const t = useTranslation();
  return (
    <div className="list-toolbar">
      <strong>
        {t("Liste sonuçları")} <span>{total ?? "—"}</span>
      </strong>
      <Button
        type="text"
        size="small"
        icon={<ColumnHeightOutlined />}
        onClick={toggle}
        aria-pressed={compact}
      >
        {t("Sıkı görünüm")}
      </Button>
    </div>
  );
}
