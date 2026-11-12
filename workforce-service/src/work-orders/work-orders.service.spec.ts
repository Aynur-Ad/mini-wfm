import { WorkOrderStatusHistory } from './entities/work-order-status-history.entity.js';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkOrdersService } from './work-orders.service.js';
import { WorkOrder } from './entities/work-order.entity.js';
import { WorkOrderPriority, WorkOrderStatus } from './work-order.enums.js';
import { requestContext } from '../common/logging/request-context.js';
import { AccountRole } from '../accounts/account-role.js';

const actor = { id: 7, username: 'planner', role: AccountRole.PLANNER };
const dto = { title: 'Bakım', dueAt: '2099-01-02T10:00:00+03:00' };

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let current: WorkOrder;
  let nextId: number;
  let insertError: Error | undefined;
  const repository = {
    findOneBy: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    manager: { transaction: vi.fn() },
  };
  const history = { create: vi.fn(), save: vi.fn() };
  const query = vi.fn();
  const create = (data = dto) =>
    requestContext.run({ correlationId: 'work-order-test', actor }, () =>
      service.create(data),
    );
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01T00:00:00Z'));
    current = Object.assign(new WorkOrder(), {
      id: 1,
      code: 'IE-2099-00001',
      title: 'Bakım',
      description: null,
      priority: WorkOrderPriority.MEDIUM,
      status: WorkOrderStatus.OPEN,
      teamId: null,
      dueAt: new Date(dto.dueAt),
      version: 1,
      createdById: 7,
    });
    repository.manager.transaction.mockImplementation(
      (work: (manager: unknown) => unknown) =>
        work({
          query,
          getRepository: (entity: unknown) =>
            entity === WorkOrderStatusHistory ? history : repository,
        }),
    );
    history.create.mockImplementation((row: object) => row);
    history.save.mockResolvedValue({});
    nextId = 1;
    insertError = undefined;
    query.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.startsWith('SELECT nextval'))
        return Promise.resolve([{ value: nextId++ }]);
      if (insertError) return Promise.reject(insertError);
      if (!params) throw new Error('INSERT parametreleri yok');
      return Promise.resolve([
        {
          id: params[0],
          code: params[1],
          title: params[2],
          description: params[3],
          priority: params[4],
          dueAt: params[5],
          createdById: params[6],
          status: WorkOrderStatus.OPEN,
          teamId: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    });
    repository.create.mockImplementation((row: object) =>
      Object.assign(new WorkOrder(), row),
    );
    repository.save.mockImplementation((row: WorkOrder) =>
      Promise.resolve(row),
    );
    repository.findOneBy.mockResolvedValue(current);
    repository.findOne.mockResolvedValue(current);
    service = new WorkOrdersService(
      repository as unknown as Repository<WorkOrder>,
    );
  });
  afterEach(() => vi.useRealTimers());

  it('sequence ile ID/kod üretir; güvenli varsayılanlar ve actor kullanılır', async () => {
    const result = await create(
      Object.assign({}, dto, {
        status: 'CANCELLED',
        teamId: 99,
        code: 'forged',
        createdById: 99,
      }),
    );
    expect(result).toMatchObject({
      id: 1,
      code: 'IE-2099-00001',
      status: WorkOrderStatus.OPEN,
      teamId: null,
      priority: WorkOrderPriority.MEDIUM,
      createdById: actor.id,
      description: null,
    });
    expect(query).toHaveBeenCalledWith(
      "SELECT nextval(pg_get_serial_sequence('workforce.work_order', 'id'))::int AS value",
    );
    expect(repository.manager.transaction).toHaveBeenCalledOnce();
  });
  it('ayrılan ID INSERT kolonları ve parametrelerinde açıktır; save ile ikinci kez üretilmez', async () => {
    nextId = 41;
    const result = await create();
    expect(result.id).toBe(41);
    expect(result.code).toBe('IE-2099-00041');
    const [sql, params] = query.mock.calls[1];
    expect(sql).toContain(
      '("id", "code", "title", "description", "priority", "due_at", "created_by_id")',
    );
    expect(sql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7)');
    expect(sql).not.toContain('DEFAULT');
    expect(params).toEqual([
      41,
      'IE-2099-00041',
      'Bakım',
      null,
      WorkOrderPriority.MEDIUM,
      new Date(dto.dueAt),
      7,
    ]);
    expect(repository.save).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(2);
    expect(nextId).toBe(42);
  });
  it('sequence numarası beş haneyi aşınca kırpmaz', async () => {
    nextId = 100001;
    expect((await create()).code).toBe('IE-2099-100001');
  });
  it('yıl değişiminde sequence sıfırlanmaz; yıl UTC üzerinden belirlenir', async () => {
    nextId = 10;
    const a = await create({ ...dto, dueAt: '2101-01-01T00:00:00Z' });
    vi.setSystemTime(new Date('2100-01-01T00:00:00Z'));
    const b = await create({ ...dto, dueAt: '2101-01-01T00:00:00Z' });
    expect(a.code).toBe('IE-2099-00010');
    expect(b.code).toBe('IE-2100-00011');
  });
  it('öncelik, açıklama ve UTC anını korur', async () => {
    const result = await create(
      Object.assign({}, dto, {
        priority: WorkOrderPriority.URGENT,
        description: 'Acil kontrol',
      }),
    );
    expect(result.priority).toBe(WorkOrderPriority.URGENT);
    expect(result.description).toBe('Acil kontrol');
    expect(result.dueAt.toISOString()).toBe('2099-01-02T07:00:00.000Z');
  });
  it('actor yoksa 401 verir', async () => {
    await expect(service.create(dto)).rejects.toMatchObject({
      error: { statusCode: 401 },
    });
  });
  it.each(['invalid', '2098-12-31T23:59:59Z'])(
    'geçersiz/geçmiş dueAt 400 verir: %s',
    async (dueAt) => {
      await expect(create({ ...dto, dueAt })).rejects.toMatchObject({
        error: { statusCode: 400 },
      });
      expect(query).not.toHaveBeenCalled();
    },
  );
  it('bulunan iş emrini döndürür', async () => {
    expect(await service.findOne(1)).toBe(current);
  });
  it('olmayan iş emri 404 verir', async () => {
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });
  it('PATCH yalnız izin verilen alanları değiştirir; durum/ekip/kod/oluşturan korunur', async () => {
    const data = Object.assign(
      {
        id: 1,
        title: 'Yeni',
        description: null,
        priority: WorkOrderPriority.HIGH,
        dueAt: '2099-01-03T00:00:00Z',
      },
      {
        status: WorkOrderStatus.CANCELLED,
        teamId: 9,
        code: 'forged',
        createdById: 99,
      },
    );
    const result = await service.update(1, data);
    expect(result).toMatchObject({
      title: 'Yeni',
      description: null,
      priority: WorkOrderPriority.HIGH,
      status: WorkOrderStatus.OPEN,
      teamId: null,
      code: current.code,
      createdById: 7,
    });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
  });
  it('gönderilmeyen alanları korur', async () => {
    const result = await service.update(1, { id: 1, title: 'Yeni' });
    expect(result.dueAt).toEqual(new Date(dto.dueAt));
    expect(result.priority).toBe(WorkOrderPriority.MEDIUM);
  });
  it.each([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED])(
    'kapanmış %s kaydı güncellenemez',
    async (status) => {
      current.status = status;
      await expect(
        service.update(1, { id: 1, title: 'Yeni' }),
      ).rejects.toMatchObject({ error: { statusCode: 409 } });
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
  it('PATCH geçmiş dueAt için 400 verir', async () => {
    await expect(
      service.update(1, { id: 1, dueAt: '2098-01-01T00:00:00Z' }),
    ).rejects.toMatchObject({ error: { statusCode: 400 } });
  });
  it('PATCH bulunmayan kayıtta 404 verir', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.update(99, { id: 99 })).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });
  it('DB hatasını yutmaz; transaction hata ile biter', async () => {
    const error = new Error('write failed');
    insertError = error;
    await expect(create()).rejects.toBe(error);
  });
  it('create ilk geçmiş satırını aynı transactionda yazar; hata varsa create başarısız olur', async () => {
    await create();
    expect(history.create).toHaveBeenCalledWith({
      workOrderId: 1,
      fromStatus: null,
      toStatus: WorkOrderStatus.OPEN,
      teamId: null,
      reason: null,
      changedById: 7,
    });
    const error = new Error('initial history failed');
    history.save.mockRejectedValue(error);
    await expect(create()).rejects.toBe(error);
  });
});