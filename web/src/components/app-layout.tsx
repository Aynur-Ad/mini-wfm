import { useState } from "react";
import { Button, Dropdown, Layout } from "antd";
import {
  ApartmentOutlined,
  DashboardOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
  CalendarOutlined,
  DownOutlined,
  LogoutOutlined,
  MenuOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LanguageSelect } from "../i18n/language-select";
import { getLanguage, useTranslation } from "../i18n/language";
import { roleLabels, useSession } from "../auth/use-session";
import { setAccessToken } from "../auth/session";

import { toggleTheme, useDarkMode } from "../theme";
const groups = [
  {
    name: "Planlama",
    icon: <CalendarOutlined />,
    pages: [{ path: "/shifts", label: "Vardiya takvimi" }],
  },
  {
    name: "İş yönetimi",
    icon: <ScheduleOutlined />,
    pages: [{ path: "/work-orders", label: "İş Emirleri" }],
  },
  {
    name: "Organizasyon",
    icon: <ApartmentOutlined />,
    pages: [
      { path: "/teams", label: "Ekipler" },
      { path: "/workforce-users", label: "Personeller" },
    ],
  },
] as const;

export function AppLayout() {
  const t = useTranslation();
  const dark = useDarkMode();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const { account } = useSession();
  const user = account.data;
  const [expanded, setExpanded] = useState(false);
  const [group, setGroup] = useState("");
  const active = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  function closeMenu() {
    setExpanded(false);
    setGroup("");
  }
  function logout() {
    setAccessToken(null);
    queryClient.clear();
    void navigate("/login", { replace: true });
  }

  return (
    <Layout className="workspace-layout">
      <nav
        aria-label={t("Ana menü")}
        className={expanded ? "side-nav expanded" : "side-nav"}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setExpanded(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") closeMenu();
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) closeMenu();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.currentTarget.querySelector("button")?.focus();
            closeMenu();
          }
        }}
      >
        <button
          className="nav-toggle"
          aria-label={t("Ana menü")}
          aria-expanded={expanded}
          onClick={() => (expanded ? closeMenu() : setExpanded(true))}
        >
          <MenuOutlined />
          {expanded && <span>{t("Ana menü")}</span>}
        </button>
        <Link
          className="dashboard-link"
          aria-label={t("Genel bakış")}
          aria-current={active("/dashboard") ? "page" : undefined}
          to="/dashboard"
          onPointerEnter={() => setGroup("")}
          onClick={closeMenu}
        >
          <DashboardOutlined />
          {expanded && t("Genel bakış")}
        </Link>
        {groups.map(({ name, icon, pages }) => {
          const open = expanded && group === name;
          return (
            <div
              key={name}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") {
                  setExpanded(true);
                  setGroup(name);
                }
              }}
            >
              <button
                className={
                  pages.some((p) => active(p.path))
                    ? "category active"
                    : "category"
                }
                aria-label={t(name)}
                aria-expanded={open}
                onClick={() => {
                  setExpanded(true);
                  setGroup(name);
                }}
              >
                {icon}
                {expanded && (
                  <>
                    <span>{t(name)}</span>
                    <DownOutlined className="nav-chevron" />
                  </>
                )}
              </button>
              {open && (
                <div className="nav-links">
                  {pages.map((p) => (
                    <Link
                      key={p.path}
                      to={p.path}
                      onClick={closeMenu}
                      aria-current={active(p.path) ? "page" : undefined}
                    >
                      {t(p.label)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {expanded && (
        <div className="nav-shade" aria-hidden="true" onClick={closeMenu} />
      )}
      <Layout className="workspace-main">
        <Layout.Header className="workspace-header">
          {user && (
            <div className="workspace-account">
              <Button
                aria-label={t(dark ? "Aydınlık moda geç" : "Karanlık moda geç")}
                title={t(dark ? "Aydınlık moda geç" : "Karanlık moda geç")}
                icon={dark ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
              />
              <LanguageSelect />
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    {
                      key: "profile",
                      label: t("Profilim"),
                      icon: <UserOutlined />,
                      onClick: () => void navigate("/profile"),
                    },
                    {
                      key: "logout",
                      label: t("Çıkış"),
                      icon: <LogoutOutlined />,
                      onClick: logout,
                    },
                  ],
                }}
              >
                <Button
                  type="text"
                  className="account-identity"
                  aria-label={t("Hesabım") + " · " + user.username}
                >
                  <span className="account-avatar" aria-hidden="true">
                    {Array.from(user.username.trim())[0]?.toLocaleUpperCase(
                      getLanguage(),
                    )}
                  </span>
                  <span className="account-details">
                    <span className="workspace-username">{user.username}</span>
                    <span className="account-role">
                      {t(roleLabels[user.role])}
                    </span>
                  </span>
                  <DownOutlined />
                </Button>
              </Dropdown>
            </div>
          )}
        </Layout.Header>
        <Layout.Content className="workspace-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
