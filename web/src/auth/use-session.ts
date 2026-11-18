import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { http } from "../api/http";
import { getAccessToken, subscribeToSession } from "./session";

export type AccountRole = "ADMIN" | "PLANNER" | "VIEWER";
export interface Account {
  id: number;
  username: string;
  role: AccountRole;
}

export const roleLabels: Record<AccountRole, string> = {
  ADMIN: "Yönetici",
  PLANNER: "Planlamacı",
  VIEWER: "İzleyici",
};

export const accountKey = (token: string | null) => ["current-account", token];

export function useAccessToken() {
  return useSyncExternalStore(subscribeToSession, getAccessToken);
}

export function useSession() {
  const token = useAccessToken();
  const account = useQuery({
    queryKey: accountKey(token),
    queryFn: async ({ signal }) =>
      (await http.get<Account>("/auth/me", { signal })).data,
    enabled: Boolean(token),
    staleTime: Infinity,
  });
  return { token, account, canManagePeople: account.data?.role === "ADMIN" };
}
