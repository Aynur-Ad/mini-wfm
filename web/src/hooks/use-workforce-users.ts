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

export const WORKFORCE_USERS_QUERY_KEY = "workforce-users";
const detailKey = (id: number) => [WORKFORCE_USERS_QUERY_KEY, "detail", id];

export function useWorkforceUsers(params: QueryWorkforceUsersParams) {
  return useQuery({
    queryKey: [WORKFORCE_USERS_QUERY_KEY, "list", params],
    queryFn: () => getWorkforceUsers(params),
  });
}

export function useWorkforceUser(id: number) {
  return useQuery({
    queryKey: detailKey(id),
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
      queryClient.setQueryData(detailKey(person.id), person);
      return queryClient.invalidateQueries({
        queryKey: [WORKFORCE_USERS_QUERY_KEY],
      });
    },
  });
}

export function useDeleteWorkforceUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteWorkforceUser(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: detailKey(id), exact: true });
      return queryClient.invalidateQueries({
        queryKey: [WORKFORCE_USERS_QUERY_KEY, "list"],
      });
    },
  });
}