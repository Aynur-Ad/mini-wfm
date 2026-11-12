import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { WorkOrdersService } from '../work-orders/work-orders.service.js';
import { WorkOrder } from '../work-orders/entities/work-order.entity.js';
import { WorkOrderStatus as Status } from '../work-orders/work-order.enums.js';
import { Account } from '../accounts/entities/account.entity.js';
import { AccountRole } from '../accounts/account-role.js';
import { requestContext } from '../common/logging/request-context.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';

const conflict = {
  error: {
    statusCode: 409,
    message: 'Kayıt siz düzenlerken değişti, sayfayı yenileyin',
  },
};

describe('İş emri optimistic locking — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined;
  let service: WorkOrdersService;
  let order: WorkOrder;
  let actor: { id: number; username: string; role: AccountRole };
  const run = <T>(work: () => Promise<T>) =>
    requestContext.run({ correlationId: 'version-int', actor }, work);
  const cancel = (version: number, reason = 'İhtiyaç kalmadı') =>
    run(() =>
      service.changeStatus(order.id, {
        id: order.id,
        version,
        expectedStatus: Status.OPEN,
        status: Status.CANCELLED,
        reason,
      }),
    );
  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    service = new WorkOrdersService(
      database.dataSource.getRepository(WorkOrder),
    );
  });
  beforeEach(async () => {
    const account = await database!.dataSource
      .getRepository(Account)
      .findOneByOrFail({ username: database!.initialAdmin.username });
    actor = {
      id: account.id,
      username: account.username,
      role: AccountRole.ADMIN,
    };
    order = await run(() =>
      service.create({
        title: 'İlk başlık',
        description: 'Korunacak açıklama',
        dueAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
      }),
    );
  });
  afterEach(async () => {
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });

  it('aynı version ile ikinci PATCH 409 verir; ilk değişikliği ezmez', async () => {
    const first = await service.update(order.id, {
      id: order.id,
      version: order.version,
      title: 'Birinci kişi',
    });
    expect(first.version).toBe(order.version + 1);
    await expect(
      service.update(order.id, {
        id: order.id,
        version: order.version,
        title: 'İkinci kişi',
      }),
    ).rejects.toMatchObject(conflict);
    expect(await service.findOne(order.id)).toMatchObject({
      title: 'Birinci kişi',
      description: 'Korunacak açıklama',
      version: 2,
    });
    expect(await service.findHistory(order.id)).toHaveLength(1);
  });
  it('aynı version ile ikinci durum isteği 409 verir; yeni geçmiş oluşturmaz', async () => {
    expect((await cancel(order.version)).version).toBe(2);
    await expect(cancel(order.version)).rejects.toMatchObject(conflict);
    expect((await service.findOne(order.id)).version).toBe(2);
    expect(await service.findHistory(order.id)).toHaveLength(2);
  });
  it('paralel PATCHlerde yalnız biri kazanır; sürüm tam bir artar', async () => {
    const results = await Promise.allSettled(
      ['Birinci', 'İkinci'].map((title) =>
        service.update(order.id, {
          id: order.id,
          version: order.version,
          title,
        }),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === 'rejected'),
    ).toMatchObject({ reason: conflict });
    const winner = results.find((result) => result.status === 'fulfilled');
    expect(winner?.status).toBe('fulfilled');
    if (winner?.status !== 'fulfilled')
      throw new Error('Başarılı güncelleme yok');
    expect(await service.findOne(order.id)).toMatchObject({
      title: winner.value.title,
      version: 2,
      description: 'Korunacak açıklama',
    });
  });
  it('paralel durum isteklerinde yalnız bir geçiş ve bir geçmiş kaydı eklenir', async () => {
    const results = await Promise.allSettled([
      cancel(1, 'Birinci neden'),
      cancel(1, 'İkinci neden'),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === 'rejected'),
    ).toMatchObject({ reason: conflict });
    expect(await service.findOne(order.id)).toMatchObject({
      version: 2,
      status: Status.CANCELLED,
    });
    const rows = await service.findHistory(order.id);
    expect(rows).toHaveLength(2);
    expect(rows[1].fromStatus).toBe(Status.OPEN);
  });
  it('PATCH ve durum isteği aynı version için yarışınca biri kazanır', async () => {
    const results = await Promise.allSettled([
      service.update(order.id, {
        id: order.id,
        version: 1,
        title: 'Yeni başlık',
      }),
      cancel(1),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === 'rejected'),
    ).toMatchObject({ reason: conflict });
    const saved = await service.findOne(order.id);
    expect(saved.version).toBe(2);
    if (results[0].status === 'fulfilled') {
      expect(saved).toMatchObject({
        title: 'Yeni başlık',
        status: Status.OPEN,
      });
      expect(await service.findHistory(order.id)).toHaveLength(1);
    } else {
      expect(saved).toMatchObject({
        title: 'İlk başlık',
        status: Status.CANCELLED,
      });
      expect(await service.findHistory(order.id)).toHaveLength(2);
    }
  });
  it('PATCH sonrası eski sürümle durum değişmez, yeniden okunan sürümle değişir', async () => {
    await service.update(order.id, {
      id: order.id,
      version: 1,
      title: 'Güncel',
    });
    await expect(cancel(1)).rejects.toMatchObject(conflict);
    const current = await service.findOne(order.id);
    expect((await cancel(current.version)).version).toBe(3);
    expect(await service.findHistory(order.id)).toHaveLength(2);
  });
  it('her başarılı PATCHte sürüm bir artar; istemci yeni sürümü kendisi seçemez', async () => {
    expect(order.version).toBe(1);
    const first = await service.update(order.id, { id: order.id, version: 1 });
    const second = await service.update(order.id, {
      id: order.id,
      version: first.version,
      description: null,
    });
    expect(second.version).toBe(3);
    expect(second.description).toBeNull();
    await expect(
      service.update(order.id, { id: order.id, version: 100, title: 'Zorla' }),
    ).rejects.toMatchObject(conflict);
    expect((await service.findOne(order.id)).version).toBe(3);
  });
  it('olmayan kayıt iki güncelleme ucunda da 404 verir', async () => {
    await expect(
      service.update(999999, { id: 999999, version: 1, title: 'Yok' }),
    ).rejects.toMatchObject({ error: { statusCode: 404 } });
    await expect(
      run(() =>
        service.changeStatus(999999, {
          id: 999999,
          version: 1,
          expectedStatus: Status.OPEN,
          status: Status.CANCELLED,
          reason: 'Yok',
        }),
      ),
    ).rejects.toMatchObject({ error: { statusCode: 404 } });
  });
  it('geçmiş hatasında sürüm de geri alınır; aynı sürümle yeniden denenebilir', async () => {
    const ds = database!.dataSource;
    await ds.query(
      "CREATE FUNCTION workforce.reject_version_history_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'history rejected'; END; $$",
    );
    try {
      await ds.query(
        'CREATE TRIGGER reject_version_history_test BEFORE INSERT ON workforce.work_order_status_history FOR EACH ROW EXECUTE FUNCTION workforce.reject_version_history_test()',
      );
      await expect(cancel(1)).rejects.toMatchObject({
        driverError: { code: 'P0001' },
      });
      expect(await service.findOne(order.id)).toMatchObject({
        version: 1,
        status: Status.OPEN,
        teamId: null,
      });
      expect(await service.findHistory(order.id)).toHaveLength(1);
    } finally {
      await ds.query(
        'DROP TRIGGER IF EXISTS reject_version_history_test ON workforce.work_order_status_history',
      );
      await ds.query('DROP FUNCTION workforce.reject_version_history_test()');
    }
    expect((await cancel(1)).version).toBe(2);
    expect(await service.findHistory(order.id)).toHaveLength(2);
  });
});