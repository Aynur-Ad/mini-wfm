import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { ConfigProvider } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkOrderDetailPage } from "./work-order-detail-page";
import type { WorkOrder } from "../work-orders/work-orders";

const mock = vi.hoisted(() => ({
  role: "ADMIN",
  get: vi.fn(),
  history: vi.fn(),
  teams: vi.fn(),
  update: vi.fn(),
  change: vi.fn(),
}));

vi.mock("../auth/use-session", () => ({
  useSession: () => ({ account: { data: { role: mock.role } } }),
}));

vi.mock("../work-orders/work-orders.api", async (original) => ({
  ...(await original<typeof import("../work-orders/work-orders.api")>()),
  getWorkOrder: mock.get,
  getWorkOrderHistory: mock.history,
  getOrderTeams: mock.teams,
  updateWorkOrder: mock.update,
  changeWorkOrderStatus: mock.change,
}));

const order: WorkOrder = {
  id: 1,
  code: "IE-2026-00001",
  title: "Pompa bakımı",
  description: "Motor kontrolü",
  dueAt: "2020-01-01T10:00:00Z",
  priority: "HIGH",
  status: "OPEN",
  teamId: null,
  version: 1,
};

function renderOrder() {
  const user = userEvent.setup();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <MemoryRouter initialEntries={["/work-orders/1"]}>
          <Routes>
            <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
  return user;
}

beforeEach(() => {
  vi.resetAllMocks();
  mock.role = "ADMIN";
  mock.get.mockResolvedValue(order);
  mock.teams.mockResolvedValue([{ id: 7, name: "Saha", isActive: true }]);
  mock.history.mockResolvedValue([
    {
      id: 1,
      fromStatus: null,
      toStatus: "OPEN",
      teamId: null,
      reason: null,
      changedAt: order.dueAt,
      changedBy: { id: 1, username: "admin" },
    },
  ]);
});

describe("İş emri detayı", () => {
  it("düzenleme sürümünü gönderir ve 409 sonrasında güncel emri yükler", async () => {
    const message = "Kayıt siz düzenlerken değişti, sayfayı yenileyin";
    const error = Object.assign(new AxiosError("409"), {
      response: { status: 409, data: { message } },
    });
    mock.update.mockRejectedValueOnce(error);
    const user = renderOrder();
    expect(await screen.findByText("İş emri oluşturuldu")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Düzenle/ }));
    const dialog = screen.getByRole("dialog");
    const title = within(dialog).getByLabelText("Başlık");
    await user.clear(title);
    await user.type(title, "Düzenlenen başlık");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(mock.update).toHaveBeenCalledWith(1, 1, {
      title: "Düzenlenen başlık",
      description: order.description,
      priority: "HIGH",
    });
    expect(
      (screen.getByRole("button", { name: "Ata" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    mock.get.mockResolvedValue({
      ...order,
      title: "Güncel başlık",
      version: 2,
    });
    await user.click(screen.getByRole("button", { name: /Yenile/ }));
    expect(
      await screen.findByRole("heading", { name: "Güncel başlık" }),
    ).toBeTruthy();
    expect(screen.queryByText(message)).toBeNull();
  });

  it("izleyicide geçmiş görünür ve değişiklik düğmeleri gizlenir", async () => {
    mock.role = "VIEWER";
    renderOrder();
    expect(await screen.findByText("İş emri oluşturuldu")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Düzenle|Ata|İptal Et/ }),
    ).toBeNull();
  });
});
