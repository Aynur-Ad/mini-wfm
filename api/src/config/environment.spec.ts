import { randomBytes } from 'node:crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';
import type { Environment } from './environment.js';
const valid = { JWT_SECRET: randomBytes(32).toString('hex') };

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

describe('JWT imza anahtarı', () => {
  it.each([undefined, '', ' '.repeat(32), 'short', 'a'.repeat(31)])(
    'eksik/kısa anahtarı reddeder',
    (key) => {
      expect(() => validateEnvironment({ ...valid, JWT_SECRET: key })).toThrow(
        'JWT_SECRET',
      );
    },
  );
  it('32 karakterlik anahtarı kabul eder', () => {
    const key = randomBytes(16).toString('hex');
    expect(validateEnvironment({ JWT_SECRET: key }).JWT_SECRET).toBe(key);
  });
  it('hata mesajında gizli anahtar yer almaz', () => {
    const key = randomBytes(8).toString('hex');
    try {
      validateEnvironment({ JWT_SECRET: key });
      expect.fail('Anahtar reddedilmeliydi');
    } catch (error) {
      expect((error as Error).message).not.toContain(key);
    }
  });
});