import { http } from "./http";
import type {
  Team,
  PaginatedResponse,
  CreateTeamDto,
  UpdateTeamDto,
  QueryTeamsParams,
} from "../types";

export const getTeams = async (
  params?: QueryTeamsParams,
): Promise<PaginatedResponse<Team>> => {
  const { data } = await http.get<PaginatedResponse<Team>>("/teams", {
    params,
  });
  return data;
};

export const getTeamById = async (id: number): Promise<Team> => {
  const { data } = await http.get<Team>(`/teams/${id}`);
  return data;
};

export const createTeam = async (payload: CreateTeamDto): Promise<Team> => {
  const { data } = await http.post<Team>("/teams", payload);
  return data;
};

export const updateTeam = async (
  id: number,
  payload: UpdateTeamDto,
): Promise<Team> => {
  const { data } = await http.patch<Team>(`/teams/${id}`, payload);
  return data;
};

export const deleteTeam = async (id: number): Promise<void> => {
  await http.delete(`/teams/${id}`);
};