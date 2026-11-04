import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { addTeamMember, removeTeamMember } from "../api/teams.api";
import {
  TEAMS_QUERY_KEY,
  WORKFORCE_USERS_QUERY_KEY,
  workforceUserDetailKey,
} from "./query-keys";

interface MembershipParams {
  teamId: number;
  workforceUserId: number;
}

function refreshMembership(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [WORKFORCE_USERS_QUERY_KEY] }),
  ]);
}

function refreshIfStale(error: Error, queryClient: QueryClient) {
  // Başka kullanıcı arada atama yapmış/pasife almış/silmiş olabilir.
  if (isAxiosError(error) && [404, 409].includes(error.response?.status ?? 0)) {
    return refreshMembership(queryClient);
  }
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, workforceUserId }: MembershipParams) =>
      addTeamMember(teamId, workforceUserId),
    onSuccess: (person) => {
      queryClient.setQueryData(workforceUserDetailKey(person.id), person);
      return refreshMembership(queryClient);
    },
    onError: (error) => refreshIfStale(error, queryClient),
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, workforceUserId }: MembershipParams) =>
      removeTeamMember(teamId, workforceUserId),
    onSuccess: () => refreshMembership(queryClient),
    onError: (error) => refreshIfStale(error, queryClient),
  });
}