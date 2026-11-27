import type { ReactNode } from "react";
import { Drawer } from "antd";
import { useNavigate, useOutlet } from "react-router-dom";
import { useTranslation } from "../i18n/language";
import type { MessageKey } from "../i18n/messages";

export function DetailListLayout({
  children,
  title,
}: {
  children: ReactNode;
  title: MessageKey;
}) {
  const detail = useOutlet();
  const navigate = useNavigate();
  const t = useTranslation();
  return (
    <>
      {children}
      <Drawer
        open={Boolean(detail)}
        title={t(title)}
        placement="right"
        size="min(540px, 100vw)"
        rootClassName="record-drawer"
        onClose={() => void navigate(".", { replace: true })}
      >
        {detail}
      </Drawer>
    </>
  );
}
