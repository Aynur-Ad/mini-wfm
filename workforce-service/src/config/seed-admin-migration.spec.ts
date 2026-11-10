import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { QueryRunner } from 'typeorm';
import { createInitialAdminSeed } from './initial-admin.config.js';
import { SeedInitialAdmin1794297888697 } from '../migrations/1794297888697-SeedInitialAdmin.js';

describe('İlk yönetici migration’ı', () => {
  it('INSERT parametrelerine yalnızca hash gönderir', async () => {
    const password = randomUUID();
    const seed = await createInitialAdminSeed({
      INITIAL_ADMIN_USERNAME: 'admin',
      INITIAL_ADMIN_PASSWORD: password,
    });
    const query = vi.fn().mockResolvedValue([]);
    const runner = {
      connection: {
        options: { type: 'postgres', extra: { initialAdmin: seed } },
      },
      query,
    } as unknown as QueryRunner;
    await new SeedInitialAdmin1794297888697().up(runner);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'), [
      'admin',
      seed.passwordHash,
    ]);
    expect(JSON.stringify(query.mock.calls)).not.toContain(password);
  });

  it('seed ayarı yoksa kayıt yazmadan hata verir', async () => {
    const query = vi.fn();
    const runner = {
      connection: { options: { type: 'postgres' } },
      query,
    } as unknown as QueryRunner;
    await expect(
      new SeedInitialAdmin1794297888697().up(runner),
    ).rejects.toThrow('İlk yönetici ayarları');
    expect(query).not.toHaveBeenCalled();
  });
  it('SQL hatasının parametrelerindeki hash bilgisini dışarı taşımaz', async () => {
    const seed = await createInitialAdminSeed({
      INITIAL_ADMIN_USERNAME: 'admin',
      INITIAL_ADMIN_PASSWORD: randomUUID(),
    });
    const query = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('driver detail'), {
          parameters: [seed.passwordHash],
        }),
      );
    const runner = {
      connection: {
        options: { type: 'postgres', extra: { initialAdmin: seed } },
      },
      query,
    } as unknown as QueryRunner;
    try {
      await new SeedInitialAdmin1794297888697().up(runner);
      expect.fail('Migration reddedilmeliydi');
    } catch (error) {
      expect((error as Error).message).toBe(
        'İlk yönetici hesabı oluşturulamadı',
      );
      expect(JSON.stringify(error)).not.toContain(seed.passwordHash);
    }
  });
});