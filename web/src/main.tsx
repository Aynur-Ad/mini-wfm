// web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import trTR from "antd/locale/tr_TR";
import enGB from "antd/locale/en_GB";
import { applyLanguage, getLanguage, useLanguage } from "./i18n/language";
import { router } from "./router";
import "./index.css";

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
  const language = useLanguage();
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={language === "en" ? enGB : trTR}
        theme={{
          token: {
            colorPrimary: "#ba4d20",
            colorSuccess: "#287651",
            colorLink: "#235f86",
            colorText: "#233832",
            colorTextSecondary: "#586b65",
            colorBorder: "#d6e1de",
            colorTextPlaceholder: "#697c76",
            controlHeight: 36,
            borderRadius: 10,
            fontFamily: 'Inter, "Segoe UI", sans-serif',
          },
          components: {
            Menu: {
              itemBg: "transparent",
              itemColor: "#39524b",
              itemHoverBg: "#edf5f9",
              itemSelectedBg: "#dcece6",
              itemSelectedColor: "#194a39",
              itemHeight: 46,
            },
            Table: {
              headerBg: "#edf4f8",
              headerColor: "#324e60",
              rowHoverBg: "#f1f7fa",
              borderColor: "#e6eeeb",
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
