import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as bcrypt from 'bcrypt';
import {
  createInitialAdminSeed,
  readInitialAdminSeed,
} from './initial-admin.config.js';

describe('İlk yönetici seed ayarları', () => {
  it('migration’a düz metin yerine yalnızca bcrypt hash sağlar', async () => {
    const password = randomUUID();
    const result = await createInitialAdminSeed({
      INITIAL_ADMIN_USERNAME: 'admin',
      INITIAL_ADMIN_PASSWORD: password,
    });
    expect(await bcrypt.compare(password, result.passwordHash)).toBe(true);
    expect(result.passwordHash).toMatch(/^\$2b\$12\$/);
    expect(JSON.stringify(result)).not.toContain(password);
    expect(readInitialAdminSeed({ initialAdmin: result })).toEqual(result);
  });
  it.each([
    undefined,
    {},
    { initialAdmin: { username: 'admin', passwordHash: 'plaintext' } },
  ])('doğrulanmamış seed verisini reddeder', (extra) => {
    expect(() => readInitialAdminSeed(extra)).toThrow('İlk yönetici ayarları');
  });
});