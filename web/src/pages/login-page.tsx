import { LanguageSelect } from "../i18n/language-select";
import { useTranslation } from "../i18n/language";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Navigate, useLocation } from "react-router-dom";
import { apiErrorMessage, http } from "../api/http";
import { setAccessToken } from "../auth/session";
import { accountKey, useAccessToken } from "../auth/use-session";
import type { Account } from "../auth/use-session";

interface Credentials {
  username: string;
  password: string;
}
interface LoginResponse {
  accessToken: string;
  user: Account;
}

export function LoginPage() {
  const t = useTranslation();
  const token = useAccessToken();
  const location = useLocation();
  const queryClient = useQueryClient();
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

  async function login(credentials: Credentials) {
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
      setAccessToken(data.accessToken);
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
      <section className="login-cover" aria-label="Mini WFM">
        <div className="login-cover-copy">
          <h2>{t("İş gücü yönetimi")}</h2>
          <p>{t("Ekipler, personel ve iş emirleri bir arada.")}</p>
        </div>
        <div className="login-illustration" aria-hidden="true">
          <div className="illustration-calendar">
            <CalendarOutlined className="illustration-icon" />
            <div className="illustration-row">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="illustration-row">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="illustration-row">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="illustration-check">
            <CheckOutlined />
          </div>
        </div>
      </section>
      <section className="login-content">
        <div className="login-form">
          <div className="login-form-heading">
            <h1>{t("Giriş yap")}</h1>
            <LanguageSelect />
          </div>
          {error && (
            <Alert
              type="error"
              showIcon
              title={error}
              className="login-alert"
            />
          )}
          <Form<Credentials>
            layout="vertical"
            requiredMark={false}
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
              <Input.Password
                prefix={<LockOutlined />}
                autoComplete="current-password"
                size="large"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={pending}
              icon={<ArrowRightOutlined aria-hidden />}
            >
              {t("Giriş yap")}
            </Button>
          </Form>
        </div>
      </section>
    </main>
  );
}
