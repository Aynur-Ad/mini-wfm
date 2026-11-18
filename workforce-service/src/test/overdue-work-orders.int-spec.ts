import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { OverdueWorkOrdersService } from '../work-orders/overdue-work-orders.service.js';
import { WorkOrdersService } from '../work-orders/work-orders.service.js';
import type { WorkOrderEventsPublisher } from '../work-orders/events/work-order-events.publisher.js';
import type { WorkOrderEvent } from '../work-orders/events/work-order-events.js';
import { WorkOrder } from '../work-orders/entities/work-order.entity.js';
import { WorkOrderStatus as S } from '../work-orders/work-order.enums.js';
import { Account } from '../accounts/entities/account.entity.js';
import { AccountRole } from '../accounts/account-role.js';
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { requestContext } from '../common/logging/request-context.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';
describe('Geciken iş emirleri — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined,
    orders: WorkOrdersService,
    team: Team,
    active: WorkforceUser,
    actor: { id: number; username: string; role: AccountRole };
  const publish = vi
    .fn<(type: string, event: WorkOrderEvent) => Promise<void>>()
    .mockResolvedValue(undefined);
  const publisher = { publish } as unknown as WorkOrderEventsPublisher;
  const worker = () =>
    new OverdueWorkOrdersService(
      database!.dataSource.getRepository(WorkOrder),
      publisher,
      new ConfigService({ OVERDUE_CHECK_CRON: '0 * * * * *' }),
      new SchedulerRegistry(),
    );
  const run = <T>(work: () => Promise<T>) =>
    requestContext.run({ correlationId: 'overdue-int', actor }, work);
  const create = async (status = S.ASSIGNED, assigned = true) => {
    const order = await run(() =>
      orders.create({
        title: 'Gecikme testi',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    );
    await database!.dataSource.query(
      'UPDATE workforce.work_order SET status=$1,team_id=$2,due_at=$3 WHERE id=$4',
      [
        status,
        assigned ? team.id : null,
        new Date(Date.now() - 60000),
        order.id,
      ],
    );
    return orders.findOne(order.id);
  };
  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    orders = new WorkOrdersService(
      database.dataSource.getRepository(WorkOrder),
    );
  });
  beforeEach(async () => {
    publish.mockClear();
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
      .save({ name: 'Gecikme Ekibi' });
    active = await database!.dataSource
      .getRepository(WorkforceUser)
      .save({
        firstName: 'Deniz',
        lastName: 'Kaya',
        registrationNumber: 'ACTIVE',
        teamId: team.id,
      });
    await database!.dataSource
      .getRepository(WorkforceUser)
      .save({
        firstName: 'Ece',
        lastName: 'Kaya',
        registrationNumber: 'INACTIVE',
        teamId: team.id,
        isActive: false,
      });
  });
  afterEach(async () => {
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });
  it('geciken kaydı bir kez yayınlar, aktif üyeyi taşır ve version değiştirmez', async () => {
    const order = await create(),
      job = worker();
    expect(await job.checkOverdue()).toBe(1);
    expect(await job.checkOverdue()).toBe(0);
    expect(publish).toHaveBeenCalledOnce();
    expect(publish.mock.calls[0][1]).toMatchObject({
      workOrderId: order.id,
      workforceUserIds: [active.id],
    });
    const saved = await orders.findOne(order.id);
    expect(saved.overdueNotifiedAt).toBeInstanceOf(Date);
    expect(saved.version).toBe(order.version);
    expect(saved.updatedAt).toEqual(order.updatedAt);
  });
  it('kapanmış ve henüz süresi dolmamış iş emirlerini yayınlamaz', async () => {
    await create(S.COMPLETED);
    await create(S.CANCELLED);
    await run(() =>
      orders.create({
        title: 'Henüz süresi dolmadı',
        dueAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    );
    expect(await worker().checkOverdue()).toBe(0);
    expect(publish).not.toHaveBeenCalled();
  });
  it('OPEN/atanmamış ve IN_PROGRESS kayıtları da yalnız bir kez değerlendirilir', async () => {
    await create(S.OPEN, false);
    await create(S.IN_PROGRESS);
    const job = worker();
    expect(await job.checkOverdue()).toBe(2);
    expect(await job.checkOverdue()).toBe(0);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(
      publish.mock.calls.some(
        ([, event]) =>
          event.teamId === null && event.workforceUserIds.length === 0,
      ),
    ).toBe(true);
  });
  it('tam dueAt anında yayınlamaz, yalnız geçtikten sonra yayınlar', async () => {
    const order = await create();
    const boundary = new Date('2026-11-18T10:00:00Z');
    await database!.dataSource.query(
      'UPDATE workforce.work_order SET due_at=$1 WHERE id=$2',
      [boundary, order.id],
    );
    const job = worker();
    expect(await job.checkOverdue(boundary)).toBe(0);
    expect(await job.checkOverdue(new Date(boundary.getTime() + 1))).toBe(1);
  });
  it('iki worker paralel çalışınca yalnız biri aynı iş emrini yayınlar', async () => {
    await create();
    const counts = await Promise.all([
      worker().checkOverdue(),
      worker().checkOverdue(),
    ]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    expect(publish).toHaveBeenCalledOnce();
  });
  it('kilitli kaydı beklemeden atlar; kilit kalkınca sonraki kontrol alır', async () => {
    const order = await create();
    const runner = database!.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        'SELECT id FROM workforce.work_order WHERE id=$1 FOR UPDATE',
        [order.id],
      );
      expect(await worker().checkOverdue()).toBe(0);
      expect(publish).not.toHaveBeenCalled();
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
    expect(await worker().checkOverdue()).toBe(1);
  });
  it('dueAt ileri alınırsa yeniden gecikmeye uygun olur; başlık değişikliği işareti korur', async () => {
    const order = await create(),
      job = worker();
    await job.checkOverdue();
    let saved = await orders.findOne(order.id);
    await orders.update(order.id, {
      id: order.id,
      version: saved.version,
      title: 'Başlık değişti',
    });
    saved = await orders.findOne(order.id);
    expect(saved.overdueNotifiedAt).not.toBeNull();
    const dueAt = new Date(Date.now() + 3600000);
    saved = await orders.update(order.id, {
      id: order.id,
      version: saved.version,
      dueAt: dueAt.toISOString(),
    });
    expect(saved.overdueNotifiedAt).toBeNull();
    expect(await job.checkOverdue()).toBe(0);
    expect(await job.checkOverdue(new Date(dueAt.getTime() + 1))).toBe(1);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[0][1].eventId).not.toBe(
      publish.mock.calls[1][1].eventId,
    );
  });
});
