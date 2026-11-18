import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry, ScheduleModule } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import type { Repository } from 'typeorm';
import {
  OverdueWorkOrdersService,
  OVERDUE_JOB_NAME,
} from './overdue-work-orders.service.js';
import { WorkOrder } from './entities/work-order.entity.js';
import type { WorkOrderEventsPublisher } from './events/work-order-events.publisher.js';
import { requestContext } from '../common/logging/request-context.js';
const now = new Date('2026-11-18T09:00:00Z');
function setup(
  rows: Partial<WorkOrder>[] = [
    {
      id: 1,
      code: 'IE-2026-00001',
      teamId: 7,
      status: 'ASSIGNED' as WorkOrder['status'],
    },
  ],
  scheduler?: SchedulerRegistry,
) {
  const builder = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    setLock: vi.fn().mockReturnThis(),
    setOnLocked: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue(rows),
  };
  const find = vi.fn().mockResolvedValue([
      { id: 8, teamId: 7 },
      { id: 9, teamId: 7 },
    ]),
    query = vi.fn().mockResolvedValue([]);
  let committed = false;
  const manager = {
    getRepository: (entity: unknown) =>
      entity === WorkOrder ? { createQueryBuilder: () => builder } : { find },
    query,
  };
  const transaction = vi.fn(async (work: (m: typeof manager) => unknown) => {
    const value = await work(manager);
    committed = true;
    return value;
  });
  const publish = vi.fn(async () => {
    expect(committed).toBe(true);
    expect(requestContext.getStore()?.correlationId).toMatch(/^cron-/);
  });
  const registry = scheduler ?? new SchedulerRegistry();
  const service = new OverdueWorkOrdersService(
    { manager: { transaction } } as unknown as Repository<WorkOrder>,
    { publish } as unknown as WorkOrderEventsPublisher,
    new ConfigService({ OVERDUE_CHECK_CRON: '0 * * * * *' }),
    registry,
  );
  return { service, builder, query, find, publish, transaction, registry };
}
afterEach(() => vi.restoreAllMocks());
describe('Geciken iş emri kontrolü', () => {
  it('yalnız geciken, kapanmamış ve işaretlenmemiş kayıtları kilitleyerek seçer', async () => {
    const s = setup();
    expect(await s.service.checkOverdue(now)).toBe(1);
    expect(s.builder.where).toHaveBeenCalledWith('workOrder.dueAt < :now', {
      now,
    });
    expect(s.builder.andWhere).toHaveBeenCalledWith(
      'workOrder.overdueNotifiedAt IS NULL',
    );
    expect(s.builder.andWhere).toHaveBeenCalledWith(
      'workOrder.status NOT IN (:...closed)',
      { closed: ['COMPLETED', 'CANCELLED'] },
    );
    expect(s.builder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(s.builder.setOnLocked).toHaveBeenCalledWith('skip_locked');
    expect(s.query).toHaveBeenCalledWith(
      expect.stringContaining('overdue_notified_at'),
      [now, [1]],
    );
    expect(s.publish).toHaveBeenCalledWith(
      'workOrderOverdue',
      expect.objectContaining({
        workOrderId: 1,
        workOrderCode: 'IE-2026-00001',
        teamId: 7,
        workforceUserIds: [8, 9],
        fromStatus: 'ASSIGNED',
        toStatus: 'ASSIGNED',
        occurredAt: now.toISOString(),
      }),
    );
  });
  it('tekrar çalışmada işaretli kayıt dönmezse tekrar yayın yapmaz', async () => {
    const s = setup();
    await s.service.checkOverdue(now);
    s.builder.getMany.mockResolvedValue([]);
    expect(await s.service.checkOverdue(now)).toBe(0);
    expect(s.publish).toHaveBeenCalledOnce();
  });
  it('transaction COMMIT başarısızsa olay yayınlanmaz', async () => {
    const s = setup();
    const original = s.transaction.getMockImplementation()!;
    s.transaction.mockImplementation(
      async (...args: Parameters<typeof original>) => {
        await original(...args);
        throw new Error('commit failed');
      },
    );
    await expect(s.service.checkOverdue(now)).rejects.toThrow('commit failed');
    expect(s.publish).not.toHaveBeenCalled();
  });
  it('atanmamış iş emri de işaretlenir ve alıcı listesi boştur', async () => {
    const s = setup([
      {
        id: 2,
        code: 'IE-2026-00002',
        teamId: null,
        status: 'OPEN' as WorkOrder['status'],
      },
    ]);
    await s.service.checkOverdue(now);
    expect(s.find).not.toHaveBeenCalled();
    expect(s.publish).toHaveBeenCalledWith(
      'workOrderOverdue',
      expect.objectContaining({ teamId: null, workforceUserIds: [] }),
    );
  });
  it('her kayıt farklı eventId alır, aynı çalışmada correlation id aynıdır', async () => {
    const s = setup([
      {
        id: 1,
        code: 'IE-2026-00001',
        teamId: 7,
        status: 'ASSIGNED' as WorkOrder['status'],
      },
      {
        id: 2,
        code: 'IE-2026-00002',
        teamId: 7,
        status: 'IN_PROGRESS' as WorkOrder['status'],
      },
    ]);
    await s.service.checkOverdue(now);
    const calls = s.publish.mock.calls as unknown as [
      string,
      { eventId: string; correlationId: string },
    ][];
    expect(new Set(calls.map(([, event]) => event.eventId)).size).toBe(2);
    expect(new Set(calls.map(([, event]) => event.correlationId)).size).toBe(1);
  });
  it('sıfır kayıt bulunduğunda da sayıyı loglar', async () => {
    const s = setup([]),
      log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    await s.service.checkOverdue(now);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"found":0'));
    expect(s.query).not.toHaveBeenCalled();
  });
  it('cron ifadesini ayardan alır, callback beklenir ve registry işi durdurabilir', async () => {
    const s = setup();
    const check = vi.spyOn(s.service, 'checkOverdue').mockResolvedValue(0);
    s.service.onApplicationBootstrap();
    const job = s.registry.getCronJob(OVERDUE_JOB_NAME);
    try {
      expect(job.cronTime.source).toBe('0 * * * * *');
      expect(job.waitForCompletion).toBe(true);
      await job.fireOnTick();
      expect(check).toHaveBeenCalledOnce();
    } finally {
      s.registry.deleteCronJob(OVERDUE_JOB_NAME);
    }
  });
  it('HTTP listen çağrılmadan app.init ile cron yaşam döngüsü başlatılır', async () => {
    const module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        {
          provide: OverdueWorkOrdersService,
          useFactory: (registry: SchedulerRegistry) =>
            setup([], registry).service,
          inject: [SchedulerRegistry],
        },
      ],
    }).compile();
    const app = module.createNestApplication({ logger: false });
    try {
      await app.init();
      expect(
        module.get(SchedulerRegistry).doesExist('cron', OVERDUE_JOB_NAME),
      ).toBe(true);
    } finally {
      await app.close();
    }
  });
});
