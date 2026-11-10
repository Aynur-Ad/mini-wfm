import type { AccountRole } from '../account-role.js';

export interface CreateAccountDto {
  username: string;
  password: string;
  role: AccountRole;
}

export interface QueryAccountsDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface ValidateCredentialsDto {
  username: string;
  password: string;
}

export interface AccountResponse {
  id: number;
  username: string;
  role: AccountRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}