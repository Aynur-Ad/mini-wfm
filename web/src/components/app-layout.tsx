import { LanguageSelect } from "../i18n/language-select";
import type { MessageKey } from "../i18n/messages";
import { useTranslation } from "../i18n/language";
import { Button, Layout, Menu } from "antd";
import {
  ThunderboltFilled,
  ScheduleOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { roleLabels, useSession } from "../auth/use-session";
import { setAccessToken } from "../auth/session";

const { Header, Sider, Content } = Layout;
const menuItems: { key: string; icon: React.ReactNode; label: MessageKey }[] = [
  { key: "/work-orders", icon: <ScheduleOutlined />, label: "İş Emirleri" },
  { key: "/teams", icon: <TeamOutlined />, label: "Ekipler" },
  { key: "/workforce-users", icon: <UserOutlined />, label: "Personeller" },
];

export function AppLayout() {
  const t = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const { account } = useSession();
  const user = account.data;
  const activePage = menuItems.find(
    ({ key }) => pathname === key || pathname.startsWith(key + "/"),
  );
  function logout() {
    setAccessToken(null);
    queryClient.clear();
    void navigate("/login", { replace: true });
  }

  return (
    <Layout className="workspace-layout">
      <Sider
        width={232}
        breakpoint="md"
        collapsedWidth={64}
        className="workspace-sider"
      >
        <div className="brand" aria-label="Mini WFM">
          <span className="brand-icon" aria-hidden="true">
            <TeamOutlined />
            <ThunderboltFilled className="brand-energy" />
          </span>
          <span className="brand-name">Mini WFM</span>
        </div>
        <Menu
          className="workspace-menu"
          mode="inline"
          selectedKeys={activePage ? [activePage.key] : []}
          items={menuItems.map((item) => ({ ...item, label: t(item.label) }))}
          onClick={({ key }) => void navigate(key)}
        />
      </Sider>
      <Layout className="workspace-main">
        <Header className="workspace-header">
          {user && (
            <div className="workspace-account">
              <LanguageSelect />
              <div className="account-identity">
                <span className="account-avatar" aria-hidden>
                  <UserOutlined />
                </span>
                <span className="account-details">
                  <span className="workspace-username">{user.username}</span>
                  <span className="account-role">
                    {t(roleLabels[user.role])}
                  </span>
                </span>
              </div>
              <Button
                className="logout-button"
                icon={<LogoutOutlined aria-hidden />}
                onClick={logout}
              >
                {t("Çıkış")}
              </Button>
            </div>
          )}
        </Header>
        <Content className="workspace-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
