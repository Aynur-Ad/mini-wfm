import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { WorkOrder } from '../work-orders/entities/work-order.entity.js';
import { WorkOrdersService } from '../work-orders/work-orders.service.js';
import {
  WorkOrderPriority,
  WorkOrderStatus,
} from '../work-orders/work-order.enums.js';
import { Team } from '../teams/entities/team.entity.js';
import { TeamsService } from '../teams/teams.service.js';
import { Account } from '../accounts/entities/account.entity.js';
import { requestContext } from '../common/logging/request-context.js';
import { AccountRole } from '../accounts/account-role.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';

describe('WorkOrdersService — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined;
  let service: WorkOrdersService;
  let teamsService: TeamsService;
  let actorId: number;
  let dueAt: string;
  const create = (title = 'Bakım') =>
    requestContext.run(
      {
        correlationId: 'work-order-int',
        actor: {
          id: actorId,
          username: 'initial_admin',
          role: AccountRole.ADMIN,
        },
      },
      () => service.create({ title, dueAt }),
    );
  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    const runner = database.dataSource.createQueryRunner();
    try {
      if (!(await runner.hasTable('workforce.work_order')))
        throw new Error(
          'Önce terminalden CreateWorkOrderTable migration dosyasını üretin.',
        );
    } finally {
      await runner.release();
    }
    service = new WorkOrdersService(
      database.dataSource.getRepository(WorkOrder),
    );
    teamsService = new TeamsService(database.dataSource.getRepository(Team));
  });
  beforeEach(async () => {
    actorId = (
      await database!.dataSource
        .getRepository(Account)
        .findOneByOrFail({ username: database!.initialAdmin.username })
    ).id;
    dueAt = new Date(Date.now() + 48 * 3_600_000).toISOString();
  });
  afterEach(async () => {
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });

  it('SERIAL sequence ile sıralı, tekil ve insan tarafından okunabilir kod üretir', async () => {
    const a = await create();
    const b = await create('İkinci bakım');
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    const year = new Date().getUTCFullYear();
    expect(a.code).toBe(`IE-${year}-00001`);
    expect(b.code).toBe(`IE-${year}-00002`);
    expect(a).toMatchObject({
      priority: WorkOrderPriority.MEDIUM,
      status: WorkOrderStatus.OPEN,
      teamId: null,
      version: 1,
      createdById: actorId,
    });
    expect((await service.findOne(a.id)).dueAt.toISOString()).toBe(dueAt);
  });
  it('paralel oluşturmalarda kodlar çakışmaz', async () => {
    const result = await Promise.all(
      Array.from({ length: 12 }, (_, index) => create(`Paralel ${index}`)),
    );
    expect(new Set(result.map((row) => row.code)).size).toBe(12);
    expect(result.map((row) => row.id).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    expect(await database!.dataSource.getRepository(WorkOrder).count()).toBe(
      12,
    );
  });
  it('DB unique kısıtı doğrudan repository yazmasında da kodu korur', async () => {
    const a = await create();
    await expect(
      database!.dataSource.getRepository(WorkOrder).insert({
        code: a.code,
        title: 'Tekrar',
        dueAt: new Date(dueAt),
        createdById: actorId,
      }),
    ).rejects.toMatchObject({
      driverError: { code: '23505', constraint: 'UQ_work_order_code' },
    });
  });
  it('PATCH durum/ekip/kod/oluşturan alanlarını değiştirmez', async () => {
    const a = await create();
    const data = Object.assign(
      {
        id: a.id,
        title: 'Yeni',
        description: null,
        priority: WorkOrderPriority.HIGH,
      },
      {
        status: WorkOrderStatus.COMPLETED,
        teamId: 999,
        code: 'forged',
        createdById: 999,
      },
    );
    const updated = await service.update(a.id, data);
    expect(updated).toMatchObject({
      title: 'Yeni',
      priority: WorkOrderPriority.HIGH,
      status: WorkOrderStatus.OPEN,
      teamId: null,
      code: a.code,
      createdById: actorId,
    });
    expect(updated.version).toBeGreaterThan(a.version);
  });
  it.each([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED])(
    'kapanmış %s iş emri güncellenemez',
    async (status) => {
      const a = await create();
      await database!.dataSource
        .getRepository(WorkOrder)
        .update(a.id, { status });
      await expect(
        service.update(a.id, { id: a.id, title: 'Yasak' }),
      ).rejects.toMatchObject({ error: { statusCode: 409 } });
      expect((await service.findOne(a.id)).title).toBe('Bakım');
    },
  );
  it('geçmiş son tarih create/PATCH için 400 verir', async () => {
    const a = await create();
    const past = new Date(Date.now() - 60_000).toISOString();
    await expect(
      service.update(a.id, { id: a.id, dueAt: past }),
    ).rejects.toMatchObject({ error: { statusCode: 400 } });
    await expect(
      requestContext.run(
        {
          correlationId: 'past',
          actor: {
            id: actorId,
            username: 'initial_admin',
            role: AccountRole.ADMIN,
          },
        },
        () => service.create({ title: 'Geçmiş', dueAt: past }),
      ),
    ).rejects.toMatchObject({ error: { statusCode: 400 } });
    expect(await database!.dataSource.getRepository(WorkOrder).count()).toBe(1);
  });
  it.each([
    WorkOrderStatus.OPEN,
    WorkOrderStatus.ASSIGNED,
    WorkOrderStatus.IN_PROGRESS,
  ])('üyesiz ekip %s iş emri varken silinemez', async (status) => {
    const team = await database!.dataSource
      .getRepository(Team)
      .save({ name: 'İş Emri Ekibi' });
    const a = await create();
    // Durum/ekip atama endpointleri 32'de gelecek; bu test yalnızca kuralın fixture'ını kurar.
    await database!.dataSource
      .getRepository(WorkOrder)
      .update(a.id, { teamId: team.id, status });
    await expect(teamsService.remove(team.id)).rejects.toMatchObject({
      error: { statusCode: 409, message: 'Açık iş emri olan ekip silinemez' },
    });
    await expect(
      database!.dataSource.getRepository(Team).delete(team.id),
    ).rejects.toMatchObject({
      driverError: { code: '23503', constraint: 'FK_work_order_team' },
    });
  });
  it('B12 gereği kapanmış bağlı geçmiş de silinmez', async () => {
    const team = await database!.dataSource
      .getRepository(Team)
      .save({ name: 'Geçmiş Ekibi' });
    const a = await create();
    await database!.dataSource
      .getRepository(WorkOrder)
      .update(a.id, { teamId: team.id, status: WorkOrderStatus.COMPLETED });
    await expect(teamsService.remove(team.id)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: 'İş emri geçmişi olan ekip silinemez',
      },
    });
  });
  it('başarısız insert sequence değerini geri kullanmaz', async () => {
    await expect(
      database!.dataSource.transaction(async (manager) => {
        await manager.query(
          "SELECT nextval(pg_get_serial_sequence('workforce.work_order', 'id'))",
        );
        throw new Error('test rollback');
      }),
    ).rejects.toThrow('test rollback');
    const a = await create();
    expect(a.id).toBe(2);
  });
});