import { AccountRole } from '../../accounts/account-role.js';

// B10: API ile aynı veri sözleşmesi, ayrı dosya. Servis JWT taşımaz veya doğrulamaz.
export interface Actor {
  id: number;
  username: string;
  role: AccountRole;
}

export function readActor(value: unknown): Actor | null {
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
  return {
    id: value.id,
    username: value.username,
    role: value.role as AccountRole,
  };
}