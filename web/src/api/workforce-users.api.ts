import { http } from "./http";
import type {
  CreateWorkforceUserDto,
  PaginatedResponse,
  QueryWorkforceUsersParams,
  UpdateWorkforceUserDto,
  WorkforceUser,
} from "../types";

export async function getWorkforceUsers(
  params?: QueryWorkforceUsersParams,
): Promise<PaginatedResponse<WorkforceUser>> {
  const { data } = await http.get<PaginatedResponse<WorkforceUser>>(
    "/workforce-users",
    { params },
  );
  return data;
}

export async function getWorkforceUserById(id: number): Promise<WorkforceUser> {
  const { data } = await http.get<WorkforceUser>(`/workforce-users/${id}`);
  return data;
}

export async function createWorkforceUser(
  payload: CreateWorkforceUserDto,
): Promise<WorkforceUser> {
  const { data } = await http.post<WorkforceUser>("/workforce-users", payload);
  return data;
}

export async function updateWorkforceUser(
  id: number,
  payload: UpdateWorkforceUserDto,
): Promise<WorkforceUser> {
  const { data } = await http.patch<WorkforceUser>(
    `/workforce-users/${id}`,
    payload,
  );
  return data;
}

export async function deleteWorkforceUser(id: number): Promise<void> {
  await http.delete(`/workforce-users/${id}`);
}