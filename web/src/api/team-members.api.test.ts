import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("./http", () => ({ http: mocks }));
import { addTeamMember, getTeamById, removeTeamMember } from "./teams.api";

describe("Ekip üyeliği HTTP istemcisi", () => {
  beforeEach(() => vi.resetAllMocks());

  it("ekip detayını üyeleriyle birlikte döndürür", async () => {
    const team = { id: 3, name: "Saha", members: [{ id: 10 }] };
    mocks.get.mockResolvedValue({ data: team });
    expect(await getTeamById(3)).toEqual(team);
    expect(mocks.get).toHaveBeenCalledWith("/teams/3");
  });

  it("atamada ekip ID URL'de, personel ID body'de taşınır", async () => {
    const person = { id: 10, teamId: 3, team: { id: 3, name: "Saha" } };
    mocks.post.mockResolvedValue({ data: person });
    expect(await addTeamMember(3, 10)).toEqual(person);
    expect(mocks.post).toHaveBeenCalledWith("/teams/3/members", {
      workforceUserId: 10,
    });
  });

  it("çıkarmada üyelik endpoint'ini çağırır ve 204 boş gövdeyi kabul eder", async () => {
    mocks.delete.mockResolvedValue({ status: 204, data: "" });
    expect(await removeTeamMember(3, 10)).toBeUndefined();
    expect(mocks.delete).toHaveBeenCalledWith("/teams/3/members/10");
  });

  it("409 hatasını çağırana taşır", async () => {
    const error = new Error("Personel başka ekipte");
    mocks.post.mockRejectedValue(error);
    await expect(addTeamMember(3, 10)).rejects.toBe(error);
  });
});