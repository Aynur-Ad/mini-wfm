import { randomUUID } from 'node:crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';
import type { Environment } from './environment.js';
const valid = {
  INITIAL_ADMIN_PASSWORD: randomUUID(),
  DB_HOST: 'localhost',
  DB_USER: 'postgres',
  DB_PASSWORD: 'test-only',
  DB_NAME: 'mini_wfm',
};

describe('Ortam ayarları', () => {
  it('varsayılan portu sayı olarak döndürür', () => {
    expect(validateEnvironment(valid).WORKFORCE_PORT).toBe(4001);
  });
  it('metin portu sayıya dönüştürür', () => {
    expect(
      validateEnvironment({ ...valid, WORKFORCE_PORT: '4100', PATH: '/bin' })
        .WORKFORCE_PORT,
    ).toBe(4100);
  });
  it.each([
    'abc',
    '',
    ' ',
    '4001abc',
    '1.5',
    '0',
    '-1',
    '65536',
    'Infinity',
    '0x10',
  ])('geçersiz portu reddeder: %s', (port) => {
    expect(() =>
      validateEnvironment({ ...valid, WORKFORCE_PORT: port }),
    ).toThrow('WORKFORCE_PORT');
  });
  it('hataları birlikte bildirir, gizli değeri yazdırmaz', () => {
    try {
      validateEnvironment({
        ...valid,
        WORKFORCE_HOST: '',
        WORKFORCE_PORT: 'secret-value',
      });
      expect.fail('Hatalı ayarlar kabul edildi');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /WORKFORCE_HOST:[\s\S]*WORKFORCE_PORT:/,
      );
      expect((error as Error).message).not.toContain('secret-value');
    }
  });
  it('doğrulanan portu gerçek ConfigService üzerinden sayı olarak okur', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          skipProcessEnv: true,
          validate: () =>
            validateEnvironment({ ...valid, WORKFORCE_PORT: '4100' }),
        }),
      ],
    }).compile();
    try {
      const config = module.get(ConfigService<Environment, true>);
      expect(config.get('WORKFORCE_PORT', { infer: true })).toBe(4100);
    } finally {
      await module.close();
    }
  });
});

describe('Veritabanı ayarları', () => {
  it('tüm eksik zorunlu değerleri listeler', () => {
    expect(() => validateEnvironment({})).toThrow(
      /DB_HOST:[\s\S]*DB_USER:[\s\S]*DB_PASSWORD:[\s\S]*DB_NAME:/,
    );
  });
  it('boş şifreyi reddeder', () => {
    expect(() => validateEnvironment({ ...valid, DB_PASSWORD: ' ' })).toThrow(
      'DB_PASSWORD',
    );
  });
  it('hatalı DB_PORT değerini reddeder', () => {
    expect(() => validateEnvironment({ ...valid, DB_PORT: 'abc' })).toThrow(
      'DB_PORT',
    );
  });
});

describe('İlk yönetici ayarları', () => {
  it('zorunlu şifre eksikse güvenli hata verir', () => {
    expect(() =>
      validateEnvironment({ ...valid, INITIAL_ADMIN_PASSWORD: undefined }),
    ).toThrow('INITIAL_ADMIN_PASSWORD');
  });
  it.each(['short', ' '.repeat(8), 'ü'.repeat(37)])(
    'geçersiz ilk yönetici şifresi reddedilir',
    (password) => {
      try {
        validateEnvironment({ ...valid, INITIAL_ADMIN_PASSWORD: password });
        expect.fail('Şifre reddedilmeliydi');
      } catch (error) {
        expect((error as Error).message).toContain('INITIAL_ADMIN_PASSWORD');
        expect((error as Error).message).not.toContain(password);
      }
    },
  );
  it('ilk yönetici adı normalize edilir', () => {
    expect(
      validateEnvironment({ ...valid, INITIAL_ADMIN_USERNAME: ' Admin ' })
        .INITIAL_ADMIN_USERNAME,
    ).toBe('admin');
  });
});