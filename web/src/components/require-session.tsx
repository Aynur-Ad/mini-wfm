import { Button, Result, Spin } from "antd";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../auth/use-session";
import { setAccessToken } from "../auth/session";

export function RequireSession() {
  const location = useLocation();
  const { token, account } = useSession();
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }
  if (account.isPending)
    return (
      <main className="center-screen">
        <Spin aria-label="Oturum yükleniyor" size="large" />
      </main>
    );
  if (account.isError) {
    return (
      <Result
        status="error"
        title="Oturum doğrulanamadı"
        extra={[
          <Button
            key="retry"
            type="primary"
            onClick={() => void account.refetch()}
          >
            Yeniden dene
          </Button>,
          <Button key="logout" onClick={() => setAccessToken(null)}>
            Çıkış
          </Button>,
        ]}
      />
    );
  }
  return <Outlet />;
}
