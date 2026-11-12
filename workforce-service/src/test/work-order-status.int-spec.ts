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
import { WorkOrderStatusHistory } from '../work-orders/entities/work-order-status-history.entity.js';
import { WorkOrdersService } from '../work-orders/work-orders.service.js';
import { WorkOrderStatus as S } from '../work-orders/work-order.enums.js';
import { Team } from '../teams/entities/team.entity.js';
import { TeamsService } from '../teams/teams.service.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { Account } from '../accounts/entities/account.entity.js';
import { AccountRole } from '../accounts/account-role.js';
import { requestContext } from '../common/logging/request-context.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';

const allowed: [S, S][] = [
  [S.OPEN, S.ASSIGNED],
  [S.OPEN, S.CANCELLED],
  [S.ASSIGNED, S.IN_PROGRESS],
  [S.ASSIGNED, S.OPEN],
  [S.ASSIGNED, S.CANCELLED],
  [S.IN_PROGRESS, S.COMPLETED],
  [S.IN_PROGRESS, S.CANCELLED],
];

describe('Durum ve geçmiş — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined;
  let service: WorkOrdersService;
  let team: Team;
  let person: WorkforceUser;
  let actor: { id: number; username: string; role: AccountRole };
  const run = <T>(work: () => Promise<T>) =>
    requestContext.run({ correlationId: 'status-int', actor }, work);
  const create = () =>
    run(() =>
      service.create({
        title: 'Durum testi',
        dueAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
      }),
    );
  const change = async (id: number, from: S, to: S, version?: number) => {
    const requestedVersion = version ?? (await service.findOne(id)).version;
    return run(() =>
      service.changeStatus(id, {
        id,
        status: to,
        version: requestedVersion,
        expectedStatus: from,
        teamId: team.id,
        reason: 'Test nedeni',
      }),
    );
  };
  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    const runner = database.dataSource.createQueryRunner();
    try {
      if (!(await runner.hasTable('workforce.work_order_status_history')))
        throw new Error(
          'Önce terminalden CreateWorkOrderStatusHistory migration dosyasını üretin.',
        );
    } finally {
      await runner.release();
    }
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
    team = await database!.dataSource
      .getRepository(Team)
      .save({ name: 'Durum Ekibi' });
    person = await database!.dataSource.getRepository(WorkforceUser).save({
      firstName: 'Deniz',
      lastName: 'Kaya',
      registrationNumber: 'STATUS-1',
      teamId: team.id,
    });
  });
  afterEach(async () => {
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });

  it.each(allowed)('%s → %s tek geçmiş satırı ekler', async (from, to) => {
    const order = await create();
    // Her izinli kenarı bağımsız sınamak için başlangıç fixture'ı hazırlanır.
    await database!.dataSource.getRepository(WorkOrder).update(order.id, {
      status: from,
      teamId: from === S.OPEN ? null : team.id,
    });
    const updated = await change(order.id, from, to);
    expect(updated.status).toBe(to);
    expect(updated.teamId).toBe(
      to === S.OPEN
        ? null
        : to === S.ASSIGNED
          ? team.id
          : from === S.OPEN
            ? null
            : team.id,
    );
    const rows = await service.findHistory(order.id);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      fromStatus: from,
      toStatus: to,
      changedById: actor.id,
      changedBy: { id: actor.id, username: actor.username },
      reason: 'Test nedeni',
    });
  });
  it('OPEN → ASSIGNED → IN_PROGRESS → COMPLETED dört sıralı satır üretir', async () => {
    const order = await create();
    await change(order.id, S.OPEN, S.ASSIGNED);
    await change(order.id, S.ASSIGNED, S.IN_PROGRESS);
    await change(order.id, S.IN_PROGRESS, S.COMPLETED);
    const rows = await service.findHistory(order.id);
    expect(rows.map((row) => row.toStatus)).toEqual([
      S.OPEN,
      S.ASSIGNED,
      S.IN_PROGRESS,
      S.COMPLETED,
    ]);
    expect(rows[0].fromStatus).toBeNull();
    expect(rows[0].teamId).toBeNull();
    expect(
      rows.every(
        (row) =>
          row.changedAt instanceof Date &&
          row.changedBy.username === actor.username,
      ),
    ).toBe(true);
    expect(Object.keys(rows[0].changedBy).sort()).toEqual(['id', 'username']);
    expect(rows.map((row) => row.changedAt.getTime())).toEqual(
      rows.map((row) => row.changedAt.getTime()).sort((a, b) => a - b),
    );
  });
  it.each([
    [S.OPEN, S.COMPLETED],
    [S.COMPLETED, S.OPEN],
    [S.IN_PROGRESS, S.ASSIGNED],
  ] as const)('izinsiz %s → %s kaydı değiştirmez', async (from, to) => {
    const order = await create();
    await database!.dataSource
      .getRepository(WorkOrder)
      .update(order.id, { status: from });
    await expect(change(order.id, from, to)).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
    expect((await service.findOne(order.id)).status).toBe(from);
    expect(await service.findHistory(order.id)).toHaveLength(1);
  });
  it('aktif üye yoksa veya ekip pasifse atama yapılmaz', async () => {
    const order = await create();
    await database!.dataSource
      .getRepository(WorkforceUser)
      .update(person.id, { isActive: false });
    await expect(change(order.id, S.OPEN, S.ASSIGNED)).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
    await database!.dataSource
      .getRepository(WorkforceUser)
      .update(person.id, { isActive: true });
    await database!.dataSource
      .getRepository(Team)
      .update(team.id, { isActive: false });
    await expect(change(order.id, S.OPEN, S.ASSIGNED)).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
    expect((await service.findOne(order.id)).status).toBe(S.OPEN);
  });
  it('atama geri alınır ve tarihçedeki önceki ekip korunur', async () => {
    const order = await create();
    await change(order.id, S.OPEN, S.ASSIGNED);
    await change(order.id, S.ASSIGNED, S.OPEN);
    const updated = await service.findOne(order.id);
    expect(updated.teamId).toBeNull();
    const rows = await service.findHistory(order.id);
    expect(rows[1].teamId).toBe(team.id);
    expect(rows[2].teamId).toBeNull();
    await database!.dataSource
      .getRepository(WorkforceUser)
      .update(person.id, { teamId: null });
    const teams = new TeamsService(database!.dataSource.getRepository(Team));
    await expect(teams.remove(team.id)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: 'İş emri durum geçmişi olan ekip silinemez',
      },
    });
  });
  it('atamadan sonra ekip pasifleşse ve üyesiz kalsa da mevcut akış otomatik değişmez', async () => {
    const order = await create();
    await change(order.id, S.OPEN, S.ASSIGNED);
    await database!.dataSource
      .getRepository(Team)
      .update(team.id, { isActive: false });
    await database!.dataSource
      .getRepository(WorkforceUser)
      .update(person.id, { teamId: null });
    expect((await change(order.id, S.ASSIGNED, S.IN_PROGRESS)).status).toBe(
      S.IN_PROGRESS,
    );
  });
  it('eşzamanlı değişiklikte yalnızca bir durum ve geçmiş satırı kaydolur', async () => {
    const order = await create();
    await change(order.id, S.OPEN, S.ASSIGNED);
    const version = (await service.findOne(order.id)).version;
    const result = await Promise.allSettled([
      change(order.id, S.ASSIGNED, S.IN_PROGRESS, version),
      change(order.id, S.ASSIGNED, S.CANCELLED, version),
    ]);
    expect(result.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect(result.find((row) => row.status === 'rejected')).toMatchObject({
      reason: { error: { statusCode: 409 } },
    });
    expect(await service.findHistory(order.id)).toHaveLength(3);
  });
  it('geçmiş INSERT hatasında durum ve version da geri alınır; create de yarım kalmaz', async () => {
    const order = await create();
    await database!.dataSource.query(
      "CREATE FUNCTION workforce.reject_history_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'history test failure'; END; $$",
    );
    try {
      await database!.dataSource.query(
        'CREATE TRIGGER reject_history_test BEFORE INSERT ON workforce.work_order_status_history FOR EACH ROW EXECUTE FUNCTION workforce.reject_history_test()',
      );
      await expect(change(order.id, S.OPEN, S.ASSIGNED)).rejects.toMatchObject({
        driverError: { code: 'P0001' },
      });
      const persisted = await service.findOne(order.id);
      expect(persisted.status).toBe(S.OPEN);
      expect(persisted.teamId).toBeNull();
      expect(persisted.version).toBe(order.version);
      expect(await service.findHistory(order.id)).toHaveLength(1);
      await expect(create()).rejects.toMatchObject({
        driverError: { code: 'P0001' },
      });
      expect(await database!.dataSource.getRepository(WorkOrder).count()).toBe(
        1,
      );
      expect(
        await database!.dataSource
          .getRepository(WorkOrderStatusHistory)
          .count(),
      ).toBe(1);
    } finally {
      await database!.dataSource.query(
        'DROP TRIGGER IF EXISTS reject_history_test ON workforce.work_order_status_history',
      );
      await database!.dataSource.query(
        'DROP FUNCTION workforce.reject_history_test()',
      );
    }
  });
});