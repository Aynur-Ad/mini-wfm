import { http } from "./http";
import type {
  Team,
  TeamDetail,
  WorkforceUser,
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

export const getTeamById = async (id: number): Promise<TeamDetail> => {
  const { data } = await http.get<TeamDetail>(`/teams/${id}`);
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

export async function addTeamMember(
  teamId: number,
  workforceUserId: number,
): Promise<WorkforceUser> {
  const { data } = await http.post<WorkforceUser>(`/teams/${teamId}/members`, {
    workforceUserId,
  });
  return data;
}

export async function removeTeamMember(
  teamId: number,
  workforceUserId: number,
): Promise<void> {
  await http.delete(`/teams/${teamId}/members/${workforceUserId}`);
}