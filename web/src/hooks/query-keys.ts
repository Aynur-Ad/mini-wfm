// Üyelik değişikliği iki kaynakta da görünür; ortak anahtarlar aynı tutulur.
export const TEAMS_QUERY_KEY = "teams";
export const WORKFORCE_USERS_QUERY_KEY = "workforce-users";
export const workforceUserDetailKey = (id: number) =>
  [WORKFORCE_USERS_QUERY_KEY, "detail", id] as const;