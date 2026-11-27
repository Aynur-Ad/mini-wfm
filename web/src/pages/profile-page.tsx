import { Alert, Card, Descriptions, Spin } from "antd";
import { roleLabels, useSession } from "../auth/use-session";
import { useTranslation, useLanguage } from "../i18n/language";
export function ProfilePage() {
  const { account } = useSession(),
    t = useTranslation(),
    language = useLanguage();
  if (account.isPending) return <Spin />;
  if (!account.data)
    return <Alert type="error" title={t("Bazı veriler yüklenemedi")} />;
  const u = account.data;
  return (
    <section>
      <header className="workspace-page-heading">
        <h1>{t("Profilim")}</h1>
      </header>
      <Card className="profile-card">
        <div className="profile-banner">
          <span className="profile-initial">
            {Array.from(u.username)[0]?.toLocaleUpperCase(language)}
          </span>
          <div>
            <h2>{u.username}</h2>
            <span>{t(roleLabels[u.role])}</span>
          </div>
        </div>
        <Descriptions
          column={1}
          items={[
            {
              key: "username",
              label: t("Kullanıcı adı"),
              children: u.username,
            },
            { key: "role", label: t("Rol"), children: t(roleLabels[u.role]) },
            { key: "id", label: t("Hesap numarası"), children: u.id },
          ]}
        />
      </Card>
    </section>
  );
}
