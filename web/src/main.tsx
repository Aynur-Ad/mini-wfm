import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ConfigProvider } from "antd";
import trTR from "antd/locale/tr_TR";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { router } from "./router";
import "./index.css";

dayjs.locale("tr");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider locale={trTR}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </React.StrictMode>,
);
