import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Notification } from '../notifications/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateNotification1794800000000 } from '../migrations/1794800000000-CreateNotification.js';
import { CreateProcessedEvent1794900000000 } from '../migrations/1794900000000-CreateProcessedEvent.js';
import { event } from './test-event.js';
describe('Bildirimler — gerçek PostgreSQL', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>> | undefined;
  let source: DataSource | undefined, service: NotificationsService;
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('notification_test')
      .withUsername('test')
      .withPassword(randomUUID())
      .start();
    source = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      username: container.getUsername(),
      password: container.getPassword(),
      namingStrategy: new SnakeNamingStrategy(),
      entities: [Notification],
      migrations: [
        CreateNotification1794800000000,
        CreateProcessedEvent1794900000000,
      ],
      migrationsTableName: 'notification_migrations',
      synchronize: false,
    });
    await source.initialize();
    await source.runMigrations();
    service = new NotificationsService(source.getRepository(Notification));
  });
  afterEach(async () => {
    if (source?.isInitialized)
      await source.query(
        'TRUNCATE notification.notification,notification.processed_event RESTART IDENTITY CASCADE',
      );
  });
  afterAll(async () => {
    try {
      if (source?.isInitialized) await source.destroy();
    } finally {
      await container?.stop();
    }
  });
  it('aynı olay paralel 8 kez gelse de iki alıcıya birer kayıt oluşur', async () => {
    await Promise.all(
      Array.from({ length: 8 }, () => service.handleAssigned(event)),
    );
    expect(await source!.getRepository(Notification).count()).toBe(2);
    expect(
      await source!.query(
        'SELECT count(*)::int AS n FROM notification.processed_event',
      ),
    ).toEqual([{ n: 1 }]);
  });
  it('kayıt hatasında marker ve bildirimler rollback olur, tekrar denenebilir', async () => {
    await source!.query(
      `ALTER TABLE notification.notification ADD CONSTRAINT reject_test CHECK (workforce_user_id <> 4)`,
    );
    try {
      await expect(service.handleAssigned(event)).rejects.toThrow();
      expect(await source!.getRepository(Notification).count()).toBe(0);
      expect(
        await source!.query(
          'SELECT count(*)::int AS n FROM notification.processed_event',
        ),
      ).toEqual([{ n: 0 }]);
    } finally {
      await source!.query(
        'ALTER TABLE notification.notification DROP CONSTRAINT reject_test',
      );
    }
    await service.handleAssigned(event);
    expect(await source!.getRepository(Notification).count()).toBe(2);
  });
  it('başka olay yeni bildirimdir; personel filtresi ve sayfalama korunur', async () => {
    await service.handleAssigned(event);
    await service.handleAssigned({ ...event, eventId: randomUUID() });
    expect(
      await service.findAll({ workforceUserId: 3, limit: 1 }),
    ).toMatchObject({ total: 2, data: [{ workforceUserId: 3 }] });
    expect((await service.findAll({ workforceUserId: 999 })).total).toBe(0);
  });
  it('eski ortak migration kaydını taşırken veriyi ve workforce geçmişini korur', async () => {
    await source!.undoLastMigration();
    await source!.query(
      'CREATE TABLE IF NOT EXISTS public.migrations (id SERIAL PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL)',
    );
    await source!.query(
      'INSERT INTO public.migrations (timestamp,name) VALUES ($1,$2),($3,$4)',
      [
        1794800000000,
        'CreateNotification1794800000000',
        1791803961816,
        'CreateWorkforceSchema1791803961816',
      ],
    );
    await source!.getRepository(Notification).insert({
      eventId: event.eventId,
      type: 'workOrderAssigned',
      workforceUserId: 3,
      title: 'Korunacak',
      body: 'Eski kayıt',
    });
    await source!.runMigrations();
    expect(await source!.query('SELECT name FROM public.migrations')).toEqual([
      { name: 'CreateWorkforceSchema1791803961816' },
    ]);
    await service.handleAssigned(event);
    expect(await source!.getRepository(Notification).count()).toBe(1);
    expect((await service.findAll({ workforceUserId: 3 })).data[0].title).toBe(
      'Korunacak',
    );
  });
  it('ilk migration mevcut tabloyu silmeden yeniden uygulanabilir', async () => {
    const runner = source!.createQueryRunner();
    await runner.connect();
    try {
      await new CreateNotification1794800000000().up(runner);
    } finally {
      await runner.release();
    }
    await service.handleAssigned(event);
    expect(await source!.getRepository(Notification).count()).toBe(2);
  });
  it('aynı gecikme olayı paralel gelince her alıcıya tek gecikme bildirimi oluşur', async () => {
    const overdue = { ...event, fromStatus: 'ASSIGNED' };
    await Promise.all(
      Array.from({ length: 8 }, () => service.handleOverdue(overdue)),
    );
    const rows = await source!.getRepository(Notification).find();
    expect(rows).toHaveLength(2);
    expect(
      rows.every(
        (row) =>
          row.type === 'workOrderOverdue' && row.title === 'İş emri gecikti',
      ),
    ).toBe(true);
  });
});
