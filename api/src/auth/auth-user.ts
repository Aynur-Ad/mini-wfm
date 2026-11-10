import type { Request } from 'express';
import { AccountRole } from '../accounts/account-role.js';

export interface AuthUser {
  id: number;
  username: string;
  role: AccountRole;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };

export function readAuthUser(value: unknown): AuthUser | null {
  if (typeof value !== 'object' || value === null) return null;
  if (
    !('id' in value) ||
    typeof value.id !== 'number' ||
    !Number.isInteger(value.id) ||
    value.id < 1
  )
    return null;
  if (
    !('username' in value) ||
    typeof value.username !== 'string' ||
    !value.username.trim() ||
    value.username.length > 50
  )
    return null;
  if (
    !('role' in value) ||
    !Object.values(AccountRole).includes(value.role as AccountRole)
  )
    return null;
  // Token'da/servis yanıtında başka alanlar bulunsa da kullanıcıya taşınmaz.
  return {
    id: value.id,
    username: value.username,
    role: value.role as AccountRole,
  };
}