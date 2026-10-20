import React from "react";
import { Layout, Menu, Typography } from "antd";
import { TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getSelectedKey = (): string => {
    if (location.pathname.startsWith("/teams")) {
      return "/teams";
    }
    if (location.pathname.startsWith("/workforce-users")) {
      return "/workforce-users";
    }
    return "";
  };

  const menuItems = [
    {
      key: "/teams",
      icon: <TeamOutlined />,
      label: "Ekipler",
    },
    {
      key: "/workforce-users",
      icon: <UserOutlined />,
      label: "Personeller",
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} theme="dark">
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
            fontWeight: 600,
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          Mini WFM
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            Mini WFM
          </Typography.Title>
        </Header>

        <Content
          style={{
            margin: 24,
            padding: 24,
            background: "#fff",
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
