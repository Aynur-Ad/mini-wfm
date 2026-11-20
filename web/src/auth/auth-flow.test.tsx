import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { message } from "antd";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { http } from "../api/http";
import { RequireSession } from "../components/require-session";
import { LoginPage } from "../pages/login-page";
import { getAccessToken, setAccessToken } from "./session";

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

function Destination() {
  const { pathname, search, hash } = useLocation();
  return <div>{pathname + search + hash}</div>;
}

describe("Giriş ve korumalı adres", () => {
  it("hatalı giriş mesajını gösterir ve başarılı girişte hedefe döner", async () => {
    const post = vi.spyOn(http, "post");
    const invalid = new AxiosError("401");
    Object.assign(invalid, {
      response: {
        status: 401,
        data: { message: "Kullanıcı adı veya şifre hatalı" },
      },
    });
    post.mockRejectedValueOnce(invalid).mockResolvedValueOnce({
      data: {
        accessToken: "test-token",
        user: { id: 1, username: "tester", role: "VIEWER" },
      },
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/teams/17?source=menu#members"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireSession />}>
              <Route path="/teams/:id" element={<Destination />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await user.type(await screen.findByLabelText("Kullanıcı adı"), "tester");
    await user.type(screen.getByLabelText("Şifre"), "test-pass");
    await user.click(screen.getByRole("button", { name: "Giriş yap" }));
    expect(
      await screen.findByText("Kullanıcı adı veya şifre hatalı"),
    ).toBeTruthy();
    expect(getAccessToken()).toBeNull();
    await user.click(screen.getByRole("button", { name: "Giriş yap" }));
    expect(
      await screen.findByText("/teams/17?source=menu#members"),
    ).toBeTruthy();
    expect(getAccessToken()).toBe("test-token");
  });

  it("Bearer başlığını ekler ve yetkisiz istekten sonra tokenı siler", async () => {
    setAccessToken("test-token");
    const response = http.get("/teams", {
      adapter: async (config) => {
        expect(config.headers.get("Authorization")).toBe("Bearer test-token");
        const error = new AxiosError("401", "ERR_BAD_REQUEST", config);
        Object.assign(error, { response: { status: 401, data: {} } });
        throw error;
      },
    });
    await expect(response).rejects.toThrow("401");
    expect(getAccessToken()).toBeNull();
  });
  it("yasak işlem mesajını gösterir ve oturumu korur", async () => {
    setAccessToken("viewer-token");
    const closed = Promise.resolve(true);
    const notify = vi
      .spyOn(message, "error")
      .mockReturnValue(
        Object.assign(vi.fn(), { then: closed.then.bind(closed) }),
      );
    const response = http.get("/accounts", {
      adapter: async (config) => {
        const error = new AxiosError("403", "ERR_BAD_REQUEST", config);
        Object.assign(error, { response: { status: 403, data: {} } });
        throw error;
      },
    });
    await expect(response).rejects.toThrow("403");
    expect(notify).toHaveBeenCalledWith("Bu işlem için yetkiniz yok");
    expect(getAccessToken()).toBe("viewer-token");
  });
});
