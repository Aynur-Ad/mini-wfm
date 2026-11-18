import { Button, Layout, Menu, Tag } from "antd";
import {
  BranchesOutlined,
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
        width={216}
        breakpoint="md"
        collapsedWidth={58}
        className="workspace-sider"
      >
        <div className="brand">
          <span className="brand-icon">
            <BranchesOutlined />
          </span>
          <span className="brand-name">Mini WFM</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={activePage ? [activePage.key] : []}
          items={menuItems}
          onClick={({ key }) => void navigate(key)}
        />
      </Sider>
      <Layout className="workspace-main">
        <Header className="workspace-header">
          <span className="workspace-section">
            {activePage?.label ?? "Mini WFM"}
          </span>
          {user && (
            <div className="workspace-account">
              <span className="workspace-username">{user.username}</span>
              <Tag color="green">{roleLabels[user.role]}</Tag>
              <Button icon={<LogoutOutlined />} onClick={logout}>
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
