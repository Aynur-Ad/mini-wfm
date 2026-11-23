import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { beforeEach, expect, it, vi } from "vitest";
import { importWorkforceUsers } from "../api/workforce-users.api";
import { WorkforceImportModal } from "./workforce-import-modal";

vi.mock("../api/workforce-users.api", () => ({
  importWorkforceUsers: vi.fn(),
}));
const upload = vi.mocked(importWorkforceUsers);
const file = new File(
  ["firstName,lastName,registrationNumber\nCan,Kaya,001"],
  "personel.csv",
);

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <WorkforceImportModal onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  upload.mockReset();
});

it("seçilen dosyayı gönderir ve eklenen kayıt sayısını gösterir", async () => {
  upload.mockResolvedValue({ imported: 1 });
  const user = userEvent.setup();
  renderModal();
  await user.upload(screen.getByLabelText("CSV dosyası"), file);
  await user.click(screen.getByRole("button", { name: "İçe aktar" }));
  expect(await screen.findByText("1 personel eklendi.")).toBeTruthy();
  expect(upload).toHaveBeenCalledTimes(1);
  expect(upload.mock.calls[0][0]).toBe(file);
});

it("sunucunun döndürdüğü CSV satır numarasını gösterir", async () => {
  const error = new AxiosError("Conflict");
  Object.assign(error, {
    response: {
      status: 409,
      data: {
        message: "CSV satırlarında sicil numarası çakışması var.",
        details: [{ row: 2, messages: ["Sicil numarası zaten var."] }],
      },
    },
  });
  upload.mockRejectedValue(error);
  const user = userEvent.setup();
  renderModal();
  await user.upload(screen.getByLabelText("CSV dosyası"), file);
  await user.click(screen.getByRole("button", { name: "İçe aktar" }));
  expect(
    await screen.findByText("Satır 2 · Sicil numarası zaten var."),
  ).toBeTruthy();
});
