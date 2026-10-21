// Ekip (Team) veri modeli (F6: Tarih alanları JSON'dan string olarak gelir)
export interface Team {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
