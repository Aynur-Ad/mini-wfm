import { Alert, Button, Card, Segmented, Spin, Tabs } from "antd";
import {
  IdcardOutlined,
  ControlOutlined,
  SunOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { roleLabels, useSession } from "../auth/use-session";
import { setAccessToken } from "../auth/session";
import { useTranslation, useLanguage } from "../i18n/language";
import { LanguageSelect } from "../i18n/language-select";
import { toggleTheme, useDarkMode } from "../theme";
import { useListDensity } from "../hooks/use-list-density";

export function ProfilePage() {
  const { account, token } = useSession(),
    t = useTranslation(),
    language = useLanguage(),
    dark = useDarkMode();
  const density = useListDensity();
  const client = useQueryClient(),
    navigate = useNavigate();
  if (account.isPending) return <Spin />;
  if (!account.data)
    return <Alert type="error" title={t("Bazı veriler yüklenemedi")} />;
  const { username, role, id } = account.data;
  const permissions =
    role === "ADMIN"
      ? t(
          "İş emirlerini, ekipleri, personelleri ve vardiya planlarını yönetebilir.",
        )
      : role === "PLANNER"
        ? t(
            "İş emirlerini ve vardiya planlarını yönetebilir, ekip ve personel bilgilerini görüntüleyebilir.",
          )
        : t(
            "İş emirlerini, ekipleri, personelleri ve vardiya planlarını görüntüleyebilir.",
          );
  function logout() {
    setAccessToken(null);
    client.clear();
    void navigate("/login", { replace: true });
  }
  const info = (
    <div className="identity-panels">
      <Card
        title={
          <h2>
            <IdcardOutlined aria-hidden="true" /> {t("Hesap bilgileri")}
          </h2>
        }
      >
        <dl className="account-data">
          {[
            [t("Kullanıcı adı"), username],
            [t("Rol"), t(roleLabels[role])],
            [t("Hesap numarası"), id],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card
        title={
          <h2>
            <SafetyCertificateOutlined aria-hidden="true" /> {t("Çalışma alanı yetkileri")}
          </h2>
        }
      >
        <span className="account-role-badge">{t(roleLabels[role])}</span>
        <p className="account-note">{permissions}</p>
      </Card>
    </div>
  );
  const preferences = (
    <Card
      className="preference-card"
      title={
        <h2>
          <ControlOutlined aria-hidden="true" /> {t("Çalışma alanı tercihleri")}
        </h2>
      }
    >
      <div className="identity-setting">
        <div>
          <strong>{t("Arayüz dili")}</strong>
          <small>{t("Menülerin ve ekranların dili.")}</small>
        </div>
        <LanguageSelect />
      </div>
      <div className="identity-setting">
        <div>
          <strong>{t("Görünüm")}</strong>
          <small>{t("Çalışma alanınızın renk teması.")}</small>
        </div>
        <Segmented
          aria-label={t("Görünüm")}
          value={dark ? "dark" : "light"}
          onChange={(v) => {
            if ((v === "dark") !== dark) toggleTheme();
          }}
          options={[
            { value: "light", label: t("Aydınlık"), icon: <SunOutlined aria-hidden="true" /> },
            { value: "dark", label: t("Karanlık"), icon: <MoonOutlined aria-hidden="true" /> },
          ]}
        />
      </div>
      <div className="identity-setting">
        <div>
          <strong>{t("Liste yoğunluğu")}</strong>
          <small>{t("Tablolardaki satırların yüksekliği.")}</small>
        </div>
        <Segmented
          aria-label={t("Liste yoğunluğu")}
          value={density.compact ? "compact" : "normal"}
          onChange={(v) => {
            if ((v === "compact") !== density.compact) density.toggle();
          }}
          options={[
            { value: "normal", label: t("Rahat") },
            { value: "compact", label: t("Sıkı") },
          ]}
        />
      </div>
      <p className="account-note preference-note">
        {t("Tercihleriniz bu tarayıcıda saklanır.")}
      </p>
    </Card>
  );
  const session = (
    <Card
      className="preference-card"
      title={
        <h2>
          <SafetyCertificateOutlined aria-hidden="true" /> {t("Oturum yönetimi")}
        </h2>
      }
    >
      <dl className="account-data">
        <div>
          <dt>{t("Oturum sahibi")}</dt>
          <dd>{username}</dd>
        </div>
        <div>
          <dt>{t("Oturum saklama")}</dt>
          <dd>
            {t(
              token && localStorage.getItem("mini-wfm.access-token") === token
                ? "Bu tarayıcı"
                : "Bu sekme",
            )}
          </dd>
        </div>
      </dl>
      <div className="session-action">
        <div>
          <h3>{t("Oturumu kapat")}</h3>
          <p className="account-note">
            {t("Bu tarayıcıdaki hesabınızdan çıkış yapın.")}
          </p>
        </div>
        <Button icon={<LogoutOutlined aria-hidden="true" />} onClick={logout}>
          {t("Çıkış")}
        </Button>
      </div>
    </Card>
  );
  return (
    <section className="account-page">
      <header className="workspace-page-heading">
        <h1>{t("Profil ve hesap")}</h1>
      </header>
      <div className="identity-header">
        <span className="identity-monogram" aria-hidden>
          {Array.from(username)[0]?.toLocaleUpperCase(language)}
        </span>
        <div>
          <h2>{username}</h2>
          <span className="identity-role">
            <SafetyCertificateOutlined aria-hidden="true" /> {t(roleLabels[role])}
          </span>
        </div>
      </div>
      <Tabs
        className="account-tabs"
        items={[
          { key: "account", label: t("Hesabım"), children: info },
          { key: "preferences", label: t("Tercihler"), children: preferences },
          { key: "session", label: t("Oturum"), children: session },
        ]}
      />
    </section>
  );
}
