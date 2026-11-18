import { describe, expect, it } from "vitest";
import { allowedTransitions, filtersToParams } from "./work-orders";

describe("İş emri ekranı", () => {
  it("çoklu durumu tekrarlı query parametresi olarak gönderir", () => {
    const params = filtersToParams({
      page: 2,
      limit: 10,
      status: ["OPEN", "ASSIGNED"],
      priority: "HIGH",
      search: " IE-2026 ",
      teamId: 7,
      overdue: true,
    });
    expect(params.getAll("status")).toEqual(["OPEN", "ASSIGNED"]);
    expect(params.get("page")).toBe("2");
    expect(params.get("search")).toBe("IE-2026");
    expect(params.get("overdue")).toBe("true");
    expect(params.get("teamId")).toBe("7");
    expect(params.get("priority")).toBe("HIGH");
  });

  it("boş filtreleri göndermez", () => {
    expect(
      filtersToParams({
        page: 1,
        limit: 10,
        status: [],
        search: "  ",
        overdue: false,
      }).toString(),
    ).toBe("page=1&limit=10");
  });

  it("durum ve role göre işlem düğmelerini sınırlar", () => {
    expect(allowedTransitions("OPEN", "VIEWER")).toEqual([]);
    expect(allowedTransitions("OPEN", "PLANNER")).toEqual([
      "ASSIGNED",
      "CANCELLED",
    ]);
    expect(allowedTransitions("ASSIGNED", "ADMIN")).toEqual([
      "IN_PROGRESS",
      "OPEN",
      "CANCELLED",
    ]);
    expect(allowedTransitions("IN_PROGRESS", "PLANNER")).toEqual(["COMPLETED"]);
    expect(allowedTransitions("IN_PROGRESS", "ADMIN")).toEqual([
      "COMPLETED",
      "CANCELLED",
    ]);
    expect(allowedTransitions("COMPLETED", "ADMIN")).toEqual([]);
    expect(allowedTransitions("CANCELLED", "ADMIN")).toEqual([]);
  });
});
