import { useTranslation } from "../i18n/language";

export function WorkspaceBrand({ compact = false }: { compact?: boolean }) {
  const t = useTranslation();
  return (
    <span
      className="workspace-brand"
      aria-label={compact ? "Ekipera" : undefined}
    >
      <img
        src={import.meta.env.BASE_URL + "favicon.svg"}
        alt=""
        width={36}
        height={36}
      />
      {!compact && (
        <span className="brand-wordmark">
          <strong>Ekipera</strong>
          <small>{t("İş gücü ve ekip yönetimi")}</small>
        </span>
      )}
    </span>
  );
}
