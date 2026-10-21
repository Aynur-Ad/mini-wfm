import axios, { AxiosError } from "axios";
import { message } from "antd";
import type { ApiErrorResponse } from "../types";

export const http = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    // Sunucudan P2 formatında (message içeren) bir hata yanıtı geldiyse
    if (error.response && error.response.data?.message) {
      const backendMessage = error.response.data.message;
      const displayMessage = Array.isArray(backendMessage)
        ? backendMessage.join(", ")
        : backendMessage;

      message.error(displayMessage);
    } else {
      // api servisi kapalıysa veya sunucuya hiç ulaşılamadıysa
      message.error("Sunucuya ulaşılamıyor");
    }

    return Promise.reject(error);
  },
);