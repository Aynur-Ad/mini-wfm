import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import {
  ArrowRightOutlined,
  BranchesOutlined,
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
      : "/teams";

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
          "Giriş yapılamadı. Bağlantını kontrol edip tekrar dene.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-cover" aria-label="Mini WFM">
        <div className="brand">
          <span className="brand-icon">
            <BranchesOutlined />
          </span>{" "}
          Mini WFM
        </div>
        <div className="login-cover-copy">
          <h2>Saha operasyonları</h2>
          <p>Ekiplerini, personelini ve günlük iş akışını tek yerden yönet.</p>
        </div>
      </section>
      <section className="login-content">
        <div className="login-form">
          <h1>Giriş yap</h1>
          <p>Mini WFM hesabınla devam et.</p>
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
              label="Kullanıcı adı"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Kullanıcı adını gir.",
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
              label="Şifre"
              rules={[{ required: true, message: "Şifreni gir." }]}
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
              Giriş yap
            </Button>
          </Form>
        </div>
      </section>
    </main>
  );
}
