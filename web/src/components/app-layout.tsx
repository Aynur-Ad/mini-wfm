import { Button, Layout, Menu } from "antd";
import {
  AppstoreOutlined,
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
const menuItems = [
  { key: "/work-orders", icon: <ScheduleOutlined />, label: "İş Emirleri" },
  { key: "/teams", icon: <TeamOutlined />, label: "Ekipler" },
  { key: "/workforce-users", icon: <UserOutlined />, label: "Personeller" },
];

export function AppLayout() {
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
          <span className="brand-icon">
            <AppstoreOutlined aria-hidden />
          </span>
          <span className="brand-name">Mini WFM</span>
        </div>
        <Menu
          className="workspace-menu"
          mode="inline"
          selectedKeys={activePage ? [activePage.key] : []}
          items={menuItems}
          onClick={({ key }) => void navigate(key)}
        />
      </Sider>
      <Layout className="workspace-main">
        <Header className="workspace-header">
          {user && (
            <div className="workspace-account">
              <div className="account-identity">
                <span className="account-avatar" aria-hidden>
                  <UserOutlined />
                </span>
                <span className="account-details">
                  <span className="workspace-username">{user.username}</span>
                  <span className="account-role">{roleLabels[user.role]}</span>
                </span>
              </div>
              <Button
                className="logout-button"
                icon={<LogoutOutlined aria-hidden />}
                onClick={logout}
              >
                Çıkış
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
