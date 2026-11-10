import * as bcrypt from 'bcrypt';
import type { Environment } from './environment.js';

export interface InitialAdminSeed {
  username: string;
  passwordHash: string;
}

export async function createInitialAdminSeed(
  config: Pick<
    Environment,
    'INITIAL_ADMIN_USERNAME' | 'INITIAL_ADMIN_PASSWORD'
  >,
): Promise<InitialAdminSeed> {
  return {
    username: config.INITIAL_ADMIN_USERNAME,
    passwordHash: await bcrypt.hash(config.INITIAL_ADMIN_PASSWORD, 12),
  };
}

export function readInitialAdminSeed(extra: unknown): InitialAdminSeed {
  if (typeof extra === 'object' && extra !== null && 'initialAdmin' in extra) {
    const value: unknown = extra.initialAdmin;
    if (
      typeof value === 'object' &&
      value !== null &&
      'username' in value &&
      'passwordHash' in value &&
      typeof value.username === 'string' &&
      typeof value.passwordHash === 'string' &&
      value.passwordHash.startsWith('$2b$12$')
    ) {
      return { username: value.username, passwordHash: value.passwordHash };
    }
  }
  throw new Error(
    'İlk yönetici ayarları doğrulanmış yapılandırmadan sağlanmalıdır',
  );
}