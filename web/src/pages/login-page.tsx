import { WorkspaceBrand } from "../components/workspace-brand";
import { LanguageSelect } from "../i18n/language-select";
import { useTranslation } from "../i18n/language";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Form, Input, Modal } from "antd";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UserOutlined,
  SunOutlined,
  MoonOutlined,
  TeamOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import { Navigate, useLocation } from "react-router-dom";
import { apiErrorMessage, http } from "../api/http";
import { setAccessToken } from "../auth/session";
import { accountKey, useAccessToken } from "../auth/use-session";
import type { Account } from "../auth/use-session";

import { toggleTheme, useDarkMode } from "../theme";

interface Credentials {
  remember?: boolean;
  username: string;
  password: string;
}
interface LoginResponse {
  accessToken: string;
  user: Account;
}

export function LoginPage() {
  const t = useTranslation();
  const dark = useDarkMode();
  const [help, setHelp] = useState(false);
  const token = useAccessToken();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const from: unknown = location.state?.from;
  const destination =
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    !from.startsWith("/\\") &&
    !/^\/login(?:[/?#]|$)/.test(from)
      ? from
      : "/dashboard";

  if (token) return <Navigate to={destination} replace />;

  async function login({ remember = false, ...credentials }: Credentials) {
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const { data } = await http.post<LoginResponse>(
        "/auth/login",
        credentials,
      );
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(accountKey(data.accessToken), data.user);
      setAccessToken(data.accessToken, remember);
    } catch (failure) {
      setError(
        apiErrorMessage(
          failure,
          t("Giriş yapılamadı. Bağlantıyı kontrol edip tekrar deneyin."),
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-cover" aria-label="Ekipera">
        <WorkspaceBrand />
        <div className="welcome-body">
          <div className="login-cover-copy">
            <h2>{t("Ekibiniz ve planınız aynı yerde.")}</h2>
            <p>{t("Ekipler, personel ve iş emirleri bir arada.")}</p>
          </div>
          <figure className="plan-sample">
            <figcaption>
              <CalendarOutlined aria-hidden /> {t("Örnek haftalık plan")}
            </figcaption>
            <div className="sample-board" aria-hidden="true">
              <small>{t("Ekip")}</small>
              {(["Pzt", "Sal", "Çar", "Per", "Cum"] as const).map((d) => (
                <small key={d}>{t(d)}</small>
              ))}
              {(["Saha ekibi", "Bakım ekibi", "Destek ekibi"] as const).map(
                (team, i) => (
                  <div className={"sample-lane lane-" + i} key={team}>
                    <b>{t(team)}</b>
                    <span>
                      <i>
                        {t(i === 1 ? "Akşam vardiyası" : "Gündüz vardiyası")}
                      </i>
                    </span>
                  </div>
                ),
              )}
            </div>
          </figure>
          <div className="welcome-modules">
            <span>
              <TeamOutlined /> {t("Ekipler")}
            </span>
            <span>
              <CalendarOutlined /> {t("Vardiya takvimi")}
            </span>
            <span>
              <ScheduleOutlined /> {t("İş Emirleri")}
            </span>
          </div>
        </div>
      </section>
      <section className="login-content">
        <div className="login-preferences">
          <Button
            type="text"
            title={t(dark ? "Aydınlık moda geç" : "Karanlık moda geç")}
            aria-label={t(dark ? "Aydınlık moda geç" : "Karanlık moda geç")}
            icon={dark ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
          />
          <LanguageSelect />
        </div>
        <div className="login-form">
          <div className="login-form-heading">
            <h1>{t("Giriş yap")}</h1>
          </div>
          <p className="login-guidance">
            {t("Çalışma alanınıza erişmek için hesabınızla giriş yapın.")}
          </p>
          {error && (
            <Alert
              role="alert"
              type="error"
              showIcon
              title={error}
              className="login-alert"
            />
          )}
          <Form<Credentials>
            layout="vertical"
            requiredMark={false}
            initialValues={{ remember: false }}
            disabled={pending}
            onFinish={login}
          >
            <Form.Item
              name="username"
              label={t("Kullanıcı adı")}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t("Kullanıcı adınızı girin."),
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                autoCapitalize="none"
                spellCheck={false}
                autoComplete="username"
                size="large"
                maxLength={50}
              />
            </Form.Item>
            <Form.Item
              name="password"
              label={t("Şifre")}
              rules={[{ required: true, message: t("Şifrenizi girin.") }]}
            >
              <Input
                type={visible ? "text" : "password"}
                id="password"
                suffix={
                  <button
                    className="password-toggle"
                    type="button"
                    aria-controls="password"
                    aria-label={t(visible ? "Şifreyi gizle" : "Şifreyi göster")}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                }
                prefix={<LockOutlined />}
                autoComplete="current-password"
                size="large"
              />
            </Form.Item>
            <div className="login-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>{t("Beni hatırla")}</Checkbox>
              </Form.Item>
              <Button type="link" onClick={() => setHelp(true)}>
                {t("Şifremi unuttum")}
              </Button>
            </div>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={pending}
              iconPlacement="end"
              icon={<ArrowRightOutlined aria-hidden />}
            >
              {t("Giriş yap")}
            </Button>
          </Form>
        </div>
      </section>
      <Modal
        title={t("Hesap erişimi")}
        open={help}
        onCancel={() => setHelp(false)}
        footer={
          <Button type="primary" onClick={() => setHelp(false)}>
            {t("Tamam")}
          </Button>
        }
      >
        <p>
          {t(
            "Şifrenizi yenilemek için kurumunuzun sistem yöneticisiyle iletişime geçin. Hesabınıza ait kullanıcı adını paylaşın.",
          )}
        </p>
      </Modal>
    </main>
  );
}
