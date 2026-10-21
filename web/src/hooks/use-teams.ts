// web/src/hooks/use-teams.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTeam,
  deleteTeam,
  getTeamById,
  getTeams,
  updateTeam,
} from "../api/teams.api";
import type { CreateTeamDto, QueryTeamsParams, UpdateTeamDto } from "../types";

export const TEAMS_QUERY_KEY = "teams";

// Ekip listesini okuma (Query)
export function useTeams(params?: QueryTeamsParams) {
  return useQuery({
    queryKey: [TEAMS_QUERY_KEY, params],
    queryFn: () => getTeams(params),
  });
}

// Tekil ekip detayını okuma (Query)
export function useTeam(id: number) {
  return useQuery({
    queryKey: [TEAMS_QUERY_KEY, id],
    queryFn: () => getTeamById(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

// Yeni ekip oluşturma (Mutation - başarılı olunca listeyi yeniler)
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTeamDto) => createTeam(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
    },
  });
}

// Ekip güncelleme (Mutation - başarılı olunca listeyi ve detayı yeniler)
export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTeamDto }) =>
      updateTeam(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
    },
  });
}

// Ekip silme (Mutation - başarılı olunca listeyi yeniler)
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_QUERY_KEY] });
    },
  });
}
