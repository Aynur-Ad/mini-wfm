import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';
const valid = {
  DB_HOST: 'localhost',
  DB_USER: 'test',
  DB_PASSWORD: 'test',
  DB_NAME: 'test',
  RABBITMQ_URL: 'amqp://localhost:5672',
};
describe('Bildirim ayar şeması', () => {
  it('port ve kuyruk varsayılanlarını yükler', () => {
    expect(validateEnvironment(valid)).toMatchObject({
      DB_PORT: 5433,
      NOTIFICATION_PORT: 4002,
      RABBITMQ_QUEUE: 'work_order_events',
    });
  });
  it.each([
    { DB_PORT: 'invalid' },
    { NOTIFICATION_PORT: 0 },
    { RABBITMQ_URL: 'https://secret:password@host' },
    { RABBITMQ_QUEUE: 'bad queue' },
    { DB_PASSWORD: '' },
  ])('geçersiz ayar: %o', (extra) => {
    expect(() => validateEnvironment({ ...valid, ...extra })).toThrow(
      'Ortam ayarları geçersiz',
    );
  });
  it('hataları birlikte listeler, gizli değeri yazmaz', () => {
    try {
      validateEnvironment({
        ...valid,
        DB_PORT: 'secret-value',
        NOTIFICATION_PORT: 'bad',
      });
      expect.fail();
    } catch (error) {
      expect((error as Error).message).toMatch(
        /NOTIFICATION_PORT:[\s\S]*DB_PORT:/,
      );
      expect((error as Error).message).not.toContain('secret-value');
    }
  });
});
