import axios, { isAxiosError, isCancel } from "axios";
import { message } from "antd";
import type { ApiErrorResponse } from "../types";
import { getAccessToken, setAccessToken } from "../auth/session";

export function apiErrorMessage(
  error: unknown,
  fallback = "Sunucuya ulaşılamıyor",
) {
  if (!isAxiosError<ApiErrorResponse>(error)) return fallback;
  const value = error.response?.data?.message;
  return Array.isArray(value) ? value.join(", ") : value || fallback;
}

export const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isCancel(error) || !isAxiosError<ApiErrorResponse>(error))
      return Promise.reject(error);
    // Giriş formu yanlış parola yanıtını kendi içinde gösterir.
    if (error.config?.url === "/auth/login") return Promise.reject(error);
    if (error.response?.status === 401) {
      const token = getAccessToken();
      // Önceki oturumdan gecikmeli dönen yanıt yeni oturumu kapatmamalı.
      if (
        token &&
        error.config?.headers.get("Authorization") === `Bearer ${token}`
      )
        setAccessToken(null);
    } else if (error.response?.status === 403) {
      void message.error("Bu işlem için yetkiniz yok");
    } else {
      void message.error(apiErrorMessage(error));
    }
    return Promise.reject(error);
  },
);
