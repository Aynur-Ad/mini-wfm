// web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { applyTheme, useDarkMode } from "./theme";
import { ConfigProvider, theme } from "antd";
import trTR from "antd/locale/tr_TR";
import enGB from "antd/locale/en_GB";
import { applyLanguage, getLanguage, useLanguage } from "./i18n/language";
import { router } from "./router";
import "./index.css";

applyTheme();
applyLanguage(getLanguage());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  const dark = useDarkMode();
  const language = useLanguage();
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={language === "en" ? enGB : trTR}
        theme={{
          algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: dark ? "#66d1c8" : "#006e70",
            colorLink: dark ? "#94ded6" : "#00666b",
            colorPrimaryText: dark ? "#99e1da" : "#075b60",
            colorTextLightSolid: dark ? "#101f30" : "#ffffff",
            colorSuccess: dark ? "#76bc9f" : "#327349",
            colorWarning: dark ? "#e4b06d" : "#9c641c",
            colorError: dark ? "#ec9296" : "#b44550",
            colorBgBase: dark ? "#182326" : "#ffffff",
            colorBgContainer: dark ? "#202f32" : "#ffffff",
            colorBgElevated: dark ? "#293b3d" : "#ffffff",
            colorBgLayout: dark ? "#182326" : "#eff4f3",
            colorText: dark ? "#e1efed" : "#223b3e",
            colorTextSecondary: dark ? "#b0c7c5" : "#4d6669",
            colorTextPlaceholder: dark ? "#a4b3c5" : "#60748b",
            colorBorder: dark ? "#4a605f" : "#b6cac7",
            colorBorderSecondary: dark ? "#384f50" : "#d3e2df",
            controlHeight: 36,
            borderRadius: 7,
            fontFamily: 'Inter, "Segoe UI", sans-serif',
          },
          components: {
            Button: {
              fontWeight: 600,
              primaryShadow: "0 2px 4px #102d4c24",
              defaultShadow: "0 1px 2px #102d4c0c",
            },
            Card: { headerFontSize: 16, headerHeight: 54 },
            Table: {
              headerBg: dark ? "#293c3e" : "#e4eeec",
              headerColor: dark ? "#c6dbd8" : "#365354",
              rowHoverBg: dark ? "#2b4446" : "#eef7f5",
              borderColor: dark ? "#384f50" : "#d7e4e1",
              cellPaddingBlock: 13,
            },
          },
        }}
      >
        <RouterProvider router={router} />
      </ConfigProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
