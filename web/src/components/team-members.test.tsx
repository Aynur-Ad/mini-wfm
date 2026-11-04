import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TeamDetailPage } from "../pages/team-detail-page";
import { WorkforceUsersPage } from "../pages/workforce-users-page";
import type {
  QueryWorkforceUsersParams,
  Team,
  TeamMember,
  UpdateTeamDto,
  UpdateWorkforceUserDto,
  WorkforceUser,
} from "../types";

const api = vi.hoisted(() => ({
  getTeamById: vi.fn(),
  getTeams: vi.fn(),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  addTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  getWorkforceUsers: vi.fn(),
  getWorkforceUserById: vi.fn(),
  createWorkforceUser: vi.fn(),
  updateWorkforceUser: vi.fn(),
  deleteWorkforceUser: vi.fn(),
}));
vi.mock("../api/teams.api", () => api);
vi.mock("../api/workforce-users.api", () => api);

let teams: Team[];
let people: WorkforceUser[];
const stamp = "2026-11-04T07:00:00Z";
const apiError = (status: number) =>
  Object.assign(new Error("API error"), {
    isAxiosError: true,
    response: { status },
  });
const buttonDisabled = (button: HTMLElement) =>
  (button as HTMLButtonElement).disabled;

function person(
  id: number,
  firstName: string,
  teamId: number | null = null,
  isActive = true,
): WorkforceUser {
  return {
    id,
    firstName,
    lastName: "Kaya",
    registrationNumber: `P${id}`,
    phone: "5321234567",
    isActive,
    teamId,
    team:
      teamId === null
        ? null
        : { id: teamId, name: teamId === 1 ? "Backend Ekibi" : "Saha Ekibi" },
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function toMember(p: WorkforceUser): TeamMember {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    registrationNumber: p.registrationNumber,
    phone: p.phone,
    isActive: p.isActive,
    teamId: p.teamId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function assign(teamId: number, workforceUserId: number) {
  const p = people.find((p) => p.id === workforceUserId)!;
  const team = teams.find((t) => t.id === teamId)!;
  p.teamId = teamId;
  p.team = { id: team.id, name: team.name };
  return structuredClone(p);
}

function renderPage(options: { peopleList?: boolean; id?: string } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <MemoryRouter initialEntries={[`/teams/${options.id ?? 1}`]}>
          <Routes>
            <Route
              path="/teams/:id"
              element={
                <>
                  <TeamDetailPage />
                  {options.peopleList && (
                    <div data-testid="people-list">
                      <WorkforceUsersPage />
                    </div>
                  )}
                </>
              }
            />
            <Route path="/teams" element={<div>Ekip listesi</div>} />
          </Routes>
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>,
  );
  return { user, client };
}

const region = () => screen.getByRole("region", { name: "Ekip üyeleri" });
async function openAdd(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /Üye Ekle$/ }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByRole("radio", { name: "Deniz Kaya seç" });
  return dialog;
}
const memberRow = (name: string) =>
  within(region()).getByText(name).closest("tr")!;
const peopleRow = (id: number) =>
  within(screen.getByTestId("people-list")).getByText(`P${id}`).closest("tr")!;

beforeEach(() => {
  vi.resetAllMocks();
  teams = [1, 2].map((id) => ({
    id,
    name: id === 1 ? "Backend Ekibi" : "Saha Ekibi",
    description: "Açıklama",
    isActive: true,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  people = [
    person(10, "Deniz"),
    person(11, "Ece", 2),
    person(12, "Cem", null, false),
    person(13, "Eren", 1),
  ];
  api.getTeamById.mockImplementation(async (id: number) => {
    const team = teams.find((t) => t.id === id);
    if (!team) throw apiError(404);
    return structuredClone({
      ...team,
      members: people.filter((p) => p.teamId === id).map(toMember),
    });
  });
  api.getWorkforceUsers.mockImplementation(
    async (params: QueryWorkforceUsersParams = {}) => {
      const { page = 1, limit = 10, search = "", isActive } = params;
      const filtered = people.filter(
        (p) =>
          (isActive === undefined || p.isActive === isActive) &&
          [p.firstName, p.lastName, p.registrationNumber].some((value) =>
            value.toLowerCase().includes(search.toLowerCase()),
          ),
      );
      return structuredClone({
        data: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length,
        page,
        limit,
      });
    },
  );
  api.addTeamMember.mockImplementation(
    async (teamId: number, personId: number) => assign(teamId, personId),
  );
  api.removeTeamMember.mockImplementation(
    async (_teamId: number, personId: number) => {
      const p = people.find((p) => p.id === personId)!;
      p.teamId = null;
      p.team = null;
    },
  );
  api.updateTeam.mockImplementation(
    async (id: number, payload: UpdateTeamDto) => {
      const team = teams.find((t) => t.id === id)!;
      Object.assign(team, payload);
      for (const p of people.filter((p) => p.teamId === id))
        p.team = { id, name: team.name };
      return structuredClone(team);
    },
  );
  api.updateWorkforceUser.mockImplementation(
    async (id: number, payload: UpdateWorkforceUserDto) => {
      const p = people.find((p) => p.id === id)!;
      Object.assign(p, payload);
      return structuredClone(p);
    },
  );
  api.deleteWorkforceUser.mockImplementation(async (id: number) => {
    people = people.filter((p) => p.id !== id);
  });
});

describe("Ekip üyeleri ekranı", () => {
  it("üye kolonlarını, sicil bağlantısını ve telefon biçimini gösterir", async () => {
    renderPage();
    await screen.findByRole("region", { name: "Ekip üyeleri" });
    for (const name of ["Sicil No", "Ad Soyad", "Telefon", "İşlemler"])
      expect(within(region()).getByRole("columnheader", { name })).toBeTruthy();
    expect(within(region()).getByText("532 123 45 67")).toBeTruthy();
    expect(
      within(region()).getByRole("link", { name: "P13" }).getAttribute("href"),
    ).toBe("/workforce-users/13");
  });

  it("üyesiz ekipte boş liste açıklamasını gösterir", async () => {
    people[3].teamId = null;
    people[3].team = null;
    renderPage();
    expect(
      await screen.findByText("Bu ekibe henüz personel atanmamış"),
    ).toBeTruthy();
  });

  it("başka ekipteki ve mevcut üyeleri ekip adıyla gösterir; atanmış/pasif kişileri seçtirmez", async () => {
    const { user } = renderPage();
    const dialog = await openAdd(user);
    expect(within(dialog).getByText("Saha Ekibi")).toBeTruthy();
    expect(within(dialog).getByText("Backend Ekibi")).toBeTruthy();
    for (const name of ["Ece Kaya seç", "Eren Kaya seç", "Cem Kaya seç"]) {
      expect(
        (within(dialog).getByRole("radio", { name }) as HTMLInputElement)
          .disabled,
      ).toBe(true);
    }
    expect(
      (
        within(dialog).getByRole("radio", {
          name: "Deniz Kaya seç",
        }) as HTMLInputElement
      ).disabled,
    ).toBe(false);
    expect(
      buttonDisabled(within(dialog).getByRole("button", { name: "Ekle" })),
    ).toBe(true);
  });

  it("aramayı 400ms bekleyerek backend'e gönderir", async () => {
    const { user } = renderPage();
    const dialog = await openAdd(user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Eklenecek personeli ara" }),
      "Deniz",
    );
    expect(
      api.getWorkforceUsers.mock.calls.some(
        ([params]) => params.search === "Deniz",
      ),
    ).toBe(false);
    await waitFor(() =>
      expect(api.getWorkforceUsers).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        search: "Deniz",
      }),
    );
    await waitFor(() =>
      expect(within(dialog).queryByText("Ece Kaya")).toBeNull(),
    );
  });

  it("arama sonucu boşsa açıklama gösterir", async () => {
    const { user } = renderPage();
    const dialog = await openAdd(user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Eklenecek personeli ara" }),
      "YOK",
    );
    expect(
      await within(dialog).findByText("Aramaya uygun personel bulunamadı"),
    ).toBeTruthy();
  });

  it("personelleri sayfalı getirir; sayfa değişiminde seçimi temizler", async () => {
    people.push(
      ...Array.from({ length: 12 }, (_, n) => person(20 + n, `Personel${n}`)),
    );
    const { user } = renderPage();
    const dialog = await openAdd(user);
    await user.click(
      within(dialog).getByRole("radio", { name: "Deniz Kaya seç" }),
    );
    await user.click(within(dialog).getByTitle("2"));
    await waitFor(() =>
      expect(api.getWorkforceUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
      ),
    );
    expect(
      buttonDisabled(within(dialog).getByRole("button", { name: "Ekle" })),
    ).toBe(true);
  });

  it("ekleme sonrası üyeler tablosunu ve açık personel listesini birlikte günceller", async () => {
    const { user } = renderPage({ peopleList: true });
    const dialog = await openAdd(user);
    await user.click(
      within(dialog).getByRole("radio", { name: "Deniz Kaya seç" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Ekle" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(api.addTeamMember).toHaveBeenCalledWith(1, 10);
    expect(await within(region()).findByText("Deniz Kaya")).toBeTruthy();
    await waitFor(() =>
      expect(
        within(peopleRow(10)).getByRole("link", { name: "Backend Ekibi" }),
      ).toBeTruthy(),
    );
    expect(screen.getByText("Personel ekibe eklendi")).toBeTruthy();
  });

  it("çıkarma onayından vazgeçilirse istek göndermez", async () => {
    const { user } = renderPage();
    await screen.findByRole("region", { name: "Ekip üyeleri" });
    await user.click(
      within(memberRow("Eren Kaya")).getByRole("button", { name: /Çıkar$/ }),
    );
    await user.click(await screen.findByRole("button", { name: "Vazgeç" }));
    expect(api.removeTeamMember).not.toHaveBeenCalled();
    expect(within(region()).getByText("Eren Kaya")).toBeTruthy();
  });

  it("onaylı çıkarma sonrası iki listeyi yeniler, personel kaydını silmez", async () => {
    const { user } = renderPage({ peopleList: true });
    await screen.findByRole("region", { name: "Ekip üyeleri" });
    await user.click(
      within(memberRow("Eren Kaya")).getByRole("button", { name: /Çıkar$/ }),
    );
    await screen.findByText("Personel ekipten çıkarılsın mı?");
    await user.click(screen.getAllByRole("button", { name: /Çıkar$/ }).at(-1)!);
    await waitFor(() =>
      expect(within(region()).queryByText("Eren Kaya")).toBeNull(),
    );
    expect(api.removeTeamMember).toHaveBeenCalledWith(1, 13);
    expect(api.deleteWorkforceUser).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        within(peopleRow(13)).queryByRole("link", { name: "Backend Ekibi" }),
      ).toBeNull(),
    );
    expect(within(peopleRow(13)).getByText("Eren Kaya")).toBeTruthy();
    expect(screen.getByText("Personel ekipten çıkarıldı")).toBeTruthy();
  });

  it("pasif ekipte Üye Ekle devre dışıdır ve hover açıklaması vardır", async () => {
    teams[0].isActive = false;
    const { user } = renderPage();
    const button = await screen.findByRole("button", { name: /Üye Ekle$/ });
    expect(buttonDisabled(button)).toBe(true);
    await user.hover(button.parentElement!);
    expect(await screen.findByRole("tooltip")).toHaveProperty(
      "textContent",
      "Pasif ekibe personel eklenemez. Önce ekibi aktif hale getirin.",
    );
    await user.click(button);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("pasif personelin Çıkar butonunu da backend kuralına uygun kapatır", async () => {
    people[3].isActive = false;
    const { user } = renderPage();
    await screen.findByRole("region", { name: "Ekip üyeleri" });
    const button = within(memberRow("Eren Kaya")).getByRole("button", {
      name: /Çıkar$/,
    });
    expect(buttonDisabled(button)).toBe(true);
    await user.hover(button.parentElement!);
    expect(
      await screen.findByText(
        "Pasif personel çıkarılamaz. Önce personeli aktif hale getirin.",
      ),
    ).toBeTruthy();
  });

  it("409 sonrası modalı korur ve başka ekibe atanmış kişiyi yeniden seçtirmez", async () => {
    api.addTeamMember.mockImplementationOnce(async () => {
      assign(2, 10);
      throw apiError(409);
    });
    const { user } = renderPage();
    const dialog = await openAdd(user);
    await user.click(
      within(dialog).getByRole("radio", { name: "Deniz Kaya seç" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Ekle" }));
    await waitFor(() =>
      expect(
        (
          within(dialog).getByRole("radio", {
            name: "Deniz Kaya seç",
          }) as HTMLInputElement
        ).disabled,
      ).toBe(true),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      buttonDisabled(within(dialog).getByRole("button", { name: "Ekle" })),
    ).toBe(true);
  });

  it("personel sorgusu hatasında yeniden deneme sunar", async () => {
    api.getWorkforceUsers.mockRejectedValueOnce(apiError(503));
    const { user } = renderPage();
    await user.click(await screen.findByRole("button", { name: /Üye Ekle$/ }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Personel listesi yüklenemedi");
    await user.click(
      within(dialog).getByRole("button", { name: /Yeniden dene$/ }),
    );
    expect(
      await within(dialog).findByRole("radio", { name: "Deniz Kaya seç" }),
    ).toBeTruthy();
  });

  it("tekrar Ekle tıklaması ikinci istek oluşturmaz; istek sürerken form kapanmaz", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    api.addTeamMember.mockImplementationOnce(
      async (teamId: number, id: number) => {
        await pending;
        return assign(teamId, id);
      },
    );
    const { user } = renderPage();
    const dialog = await openAdd(user);
    await user.click(
      within(dialog).getByRole("radio", { name: "Deniz Kaya seç" }),
    );
    await user.dblClick(within(dialog).getByRole("button", { name: "Ekle" }));
    expect(api.addTeamMember).toHaveBeenCalledTimes(1);
    expect(
      buttonDisabled(within(dialog).getByRole("button", { name: "Vazgeç" })),
    ).toBe(true);
    expect(
      (within(dialog).getByRole("textbox") as HTMLInputElement).disabled,
    ).toBe(true);
    release();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("modal yeniden açılınca önceki arama ve seçim temizlenir", async () => {
    const { user } = renderPage();
    let dialog = await openAdd(user);
    await user.click(
      within(dialog).getByRole("radio", { name: "Deniz Kaya seç" }),
    );
    await user.type(within(dialog).getByRole("textbox"), "Den");
    await user.click(within(dialog).getByRole("button", { name: "Vazgeç" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    dialog = await openAdd(user);
    expect(
      (within(dialog).getByRole("textbox") as HTMLInputElement).value,
    ).toBe("");
    expect(
      buttonDisabled(within(dialog).getByRole("button", { name: "Ekle" })),
    ).toBe(true);
  });

  it("arama yazılırken eski seçimi göndermez", async () => {
    const { user } = renderPage();
    const dialog = await openAdd(user);
    await user.click(
      within(dialog).getByRole("radio", { name: "Deniz Kaya seç" }),
    );
    await user.type(within(dialog).getByRole("textbox"), "Ece");
    expect(
      buttonDisabled(within(dialog).getByRole("button", { name: "Ekle" })),
    ).toBe(true);
    expect(api.addTeamMember).not.toHaveBeenCalled();
  });

  it("olmayan ekip için bulunamadı ekranı gösterir", async () => {
    renderPage({ id: "999" });
    expect(await screen.findByText("Ekip bulunamadı")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Ekip üyeleri" })).toBeNull();
  });

  it("geçersiz ID için API isteği göndermez", async () => {
    renderPage({ id: "abc" });
    expect(await screen.findByText("Ekip bulunamadı")).toBeTruthy();
    expect(api.getTeamById).not.toHaveBeenCalled();
  });

  it("bağlantı hatasını 404 gibi göstermez ve yeniden deneyebilir", async () => {
    api.getTeamById.mockRejectedValueOnce(apiError(503));
    const { user } = renderPage();
    await screen.findByText("Ekip bilgileri yüklenemedi");
    expect(screen.queryByText("Ekip bulunamadı")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Yeniden dene$/ }));
    expect(
      await screen.findByRole("region", { name: "Ekip üyeleri" }),
    ).toBeTruthy();
  });

  it("personel listesinde ekip kolonunu ve ekip detay bağlantısını gösterir", async () => {
    renderPage({ peopleList: true });
    await within(screen.getByTestId("people-list")).findByText("Ece Kaya");
    expect(
      within(screen.getByTestId("people-list")).getByRole("columnheader", {
        name: "Ekip",
      }),
    ).toBeTruthy();
    expect(
      within(peopleRow(11))
        .getByRole("link", { name: "Saha Ekibi" })
        .getAttribute("href"),
    ).toBe("/teams/2");
    expect(within(peopleRow(10)).getByText("—")).toBeTruthy();
  });

  it("ekip adı düzenlenince personel listesindeki ekip adı da yenilenir", async () => {
    const { user } = renderPage({ peopleList: true });
    await screen.findByRole("region", { name: "Ekip üyeleri" });
    await user.click(screen.getAllByRole("button", { name: /Düzenle$/ })[0]);
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText("Ekip Adı");
    await user.clear(input);
    await user.type(input, "Yeni Ekip Adı");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    await waitFor(() =>
      expect(
        within(peopleRow(13)).getByRole("link", { name: "Yeni Ekip Adı" }),
      ).toBeTruthy(),
    );
  });

  it("personel profilindeki ad değişikliği üyeler tablosuna da yansır", async () => {
    const { user } = renderPage({ peopleList: true });
    await within(screen.getByTestId("people-list")).findByText("Eren Kaya");
    await user.click(
      within(peopleRow(13)).getByRole("button", { name: /Düzenle$/ }),
    );
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText("Ad");
    await user.clear(input);
    await user.type(input, "Yeni Ad");
    await user.click(within(dialog).getByRole("button", { name: "Kaydet" }));
    expect(await within(region()).findByText("Yeni Ad Kaya")).toBeTruthy();
  });

  it("personel kaydı silinince üyeler tablosundaki satır da kalkar", async () => {
    const { user } = renderPage({ peopleList: true });
    await within(screen.getByTestId("people-list")).findByText("Eren Kaya");
    await user.click(
      within(peopleRow(13)).getByRole("button", { name: /Sil$/ }),
    );
    await screen.findByText("Personeli silmek istediğinize emin misiniz?");
    await user.click(screen.getAllByRole("button", { name: /Sil$/ }).at(-1)!);
    await waitFor(() =>
      expect(within(region()).queryByText("Eren Kaya")).toBeNull(),
    );
    expect(api.deleteWorkforceUser).toHaveBeenCalledWith(13);
  });

  it("çıkarma başarısızsa üyeyi tablodan kaldırmaz", async () => {
    api.removeTeamMember.mockRejectedValueOnce(apiError(503));
    const { user } = renderPage();
    await screen.findByRole("region", { name: "Ekip üyeleri" });
    await user.click(
      within(memberRow("Eren Kaya")).getByRole("button", { name: /Çıkar$/ }),
    );
    await screen.findByText("Personel ekipten çıkarılsın mı?");
    await user.click(screen.getAllByRole("button", { name: /Çıkar$/ }).at(-1)!);
    await waitFor(() => expect(api.removeTeamMember).toHaveBeenCalledOnce());
    expect(within(region()).getByText("Eren Kaya")).toBeTruthy();
    expect(people.find((p) => p.id === 13)?.teamId).toBe(1);
  });

  it("modal açıkken ekip pasife alınırsa 409 sonrası eklemeyi kapatır", async () => {
    api.addTeamMember.mockImplementationOnce(async () => {
      teams[0].isActive = false;
      throw apiError(409);
    });
    const { user } = renderPage();
    const dialog = await openAdd(user);
    await user.click(
      within(dialog).getByRole("radio", { name: "Deniz Kaya seç" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Ekle" }));
    expect(
      await within(dialog).findByText("Pasif ekibe personel eklenemez."),
    ).toBeTruthy();
    expect(
      buttonDisabled(within(dialog).getByRole("button", { name: "Ekle" })),
    ).toBe(true);
  });
});