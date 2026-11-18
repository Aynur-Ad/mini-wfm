// web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import trTR from "antd/locale/tr_TR";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { router } from "./router";
import "./index.css";

dayjs.locale("tr");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={trTR}
        theme={{
          token: {
            colorPrimary: "#b84d16",
            colorSuccess: "#287651",
            colorLink: "#23664c",
            colorText: "#1b3328",
            borderRadius: 10,
            fontFamily: 'Inter, "Segoe UI", sans-serif',
          },
          components: {
            Menu: {
              darkItemBg: "#153e30",
              darkItemSelectedBg: "#285744",
              darkItemSelectedColor: "#fff7ec",
            },
            Table: { headerBg: "#f3f6f0" },
          },
        }}
      >
        <RouterProvider router={router} />
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
