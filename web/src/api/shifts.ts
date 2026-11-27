import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { http } from "./http";
import type { WorkforceUser } from "../types";

import { getWorkforceUsers } from "./workforce-users.api";

export interface Shift {
  id: number;
  workforceUserId: number;
  startAt: string;
  endAt: string;
  note: string | null;
  workforceUser: Pick<WorkforceUser, "id" | "firstName" | "lastName" | "team">;
}
export interface RotationPlan {
  assignments: {
    workforceUserId: number;
    registrationNumber: string;
    slot: string;
    date: string;
    startAt: string;
    endAt: string;
  }[];
  unfilled: {
    date: string;
    slot: string;
    missing: number;
    reasonCodes: string[];
  }[];
  applied: boolean;
}
export function monday(date: Dayjs = dayjs()) {
  return date.startOf("day").subtract((date.day() + 6) % 7, "day");
}
export function useWeek(start: Dayjs, teamId?: number) {
  const params = {
    from: start.toISOString(),
    to: start.add(7, "day").toISOString(),
    teamId,
  };
  return useQuery({
    queryKey: ["shifts", params],
    queryFn: async ({ signal }) =>
      (await http.get<Shift[]>("/shifts", { params, signal })).data,
  });
}
export async function allPeople() {
  const people: WorkforceUser[] = [];
  for (let page = 1; ; page++) {
    const result = await getWorkforceUsers({ page, limit: 100 });
    people.push(...result.data);
    if (!result.data.length || people.length >= result.total) return people;
  }
}
