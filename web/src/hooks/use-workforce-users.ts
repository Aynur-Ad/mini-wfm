import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWorkforceUser,
  deleteWorkforceUser,
  getWorkforceUserById,
  getWorkforceUsers,
  updateWorkforceUser,
} from "../api/workforce-users.api";
import type {
  CreateWorkforceUserDto,
  QueryWorkforceUsersParams,
  UpdateWorkforceUserDto,
} from "../types";
import {
  TEAMS_QUERY_KEY,
  WORKFORCE_USERS_QUERY_KEY,
  workforceUserDetailKey,
} from "./query-keys";

export { WORKFORCE_USERS_QUERY_KEY } from "./query-keys";

export function useWorkforceUsers(params: QueryWorkforceUsersParams) {
  return useQuery({
    queryKey: [WORKFORCE_USERS_QUERY_KEY, "list", params],
    queryFn: () => getWorkforceUsers(params),
  });
}

export function useWorkforceUser(id: number) {
  return useQuery({
    queryKey: workforceUserDetailKey(id),
    queryFn: () => getWorkforceUserById(id),
    enabled: Number.isSafeInteger(id) && id > 0,
  });
}

export function useCreateWorkforceUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkforceUserDto) =>
      createWorkforceUser(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [WORKFORCE_USERS_QUERY_KEY, "list"],
      }),
  });
}

export function useUpdateWorkforceUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateWorkforceUserDto;
    }) => updateWorkforceUser(id, payload),
    onSuccess: (person) => {
      queryClient.setQueryData(workforceUserDetailKey(person.id), person);
      // Üyeler tablosundaki ad/telefon/durum da güncel kalsın.
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: [WORKFORCE_USERS_QUERY_KEY],
        }),
        queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] }),
      ]);
    },
  });
}

export function useDeleteWorkforceUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteWorkforceUser(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({
        queryKey: workforceUserDetailKey(id),
        exact: true,
      });
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: [WORKFORCE_USERS_QUERY_KEY, "list"],
        }),
        queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] }),
      ]);
    },
  });
}