// Ekip (Team) veri modeli (F6: Tarih alanları JSON'dan string olarak gelir)
export interface Team {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSummary {
  id: number;
  name: string;
}

// Üyede üstteki ekip tekrar bulunmaz; döngüsel veri taşınmaz.
export type TeamMember = Omit<WorkforceUser, "team">;

export interface TeamDetail extends Team {
  members: TeamMember[];
}

// create-team.dto.ts karşılığı
export interface CreateTeamDto {
  name: string;
  description?: string;
}

// update-team.dto.ts karşılığı (CreateTeamDto'nun opsiyonel hali + isActive)
export interface UpdateTeamDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// query-teams.dto.ts karşılığı
export interface QueryTeamsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

// P2 Liste yanıt biçimi
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// P2 Hata yanıt biçimi (global-exception.filter.ts çıktısı)
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
}

// Personel backend'inin JSON yanıtı; tarihler metin, boş telefon null gelir.
export interface WorkforceUser {
  id: number;
  firstName: string;
  lastName: string;
  registrationNumber: string;
  phone: string | null;
  isActive: boolean;
  teamId: number | null;
  team: TeamSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkforceUserDto {
  firstName: string;
  lastName: string;
  registrationNumber: string;
  phone?: string | null;
}

export interface UpdateWorkforceUserDto {
  firstName?: string;
  lastName?: string;
  registrationNumber?: string;
  phone?: string | null;
  isActive?: boolean;
}

export interface QueryWorkforceUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}