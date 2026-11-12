import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkOrdersService } from './work-orders.service.js';
import { WorkOrder } from './entities/work-order.entity.js';
import { WorkOrderStatusHistory } from './entities/work-order-status-history.entity.js';
import { WorkOrderStatus as S } from './work-order.enums.js';
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { requestContext } from '../common/logging/request-context.js';
import { AccountRole } from '../accounts/account-role.js';

const allowed: [S, S][] = [
  [S.OPEN, S.ASSIGNED],
  [S.OPEN, S.CANCELLED],
  [S.ASSIGNED, S.IN_PROGRESS],
  [S.ASSIGNED, S.OPEN],
  [S.ASSIGNED, S.CANCELLED],
  [S.IN_PROGRESS, S.COMPLETED],
  [S.IN_PROGRESS, S.CANCELLED],
];
const forbidden = Object.values(S).flatMap((a) =>
  Object.values(S)
    .filter((b) => !allowed.some(([x, y]) => x === a && y === b))
    .map((b) => [a, b] as const),
);
const actor = { id: 7, username: 'admin', role: AccountRole.ADMIN };

describe('İş emri durum/geçmiş service', () => {
  let service: WorkOrdersService;
  let current: WorkOrder;
  let changes: Record<string, unknown>;
  const mutation = {
    update: vi.fn(),
    set: vi.fn(),
    where: vi.fn(),
    andWhere: vi.fn(),
    execute: vi.fn(),
  };
  const history = { create: vi.fn(), save: vi.fn() };
  const team = { findOne: vi.fn() };
  const members = {
    select: vi.fn(),
    where: vi.fn(),
    andWhere: vi.fn(),
    orderBy: vi.fn(),
    setLock: vi.fn(),
    getMany: vi.fn(),
  };
  const people = { createQueryBuilder: vi.fn() };
  const orders = {
    createQueryBuilder: vi.fn(),
    findOneByOrFail: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    manager: { transaction: vi.fn() },
  };
  const change = (status: S, extra: object = {}) =>
    requestContext.run({ correlationId: 'status-test', actor }, () =>
      service.changeStatus(
        1,
        Object.assign(
          {
            id: 1,
            version: current.version,
            status,
            expectedStatus: current.status,
            teamId: 2,
            reason: '  neden  ',
          },
          extra,
        ),
      ),
    );
  beforeEach(() => {
    vi.resetAllMocks();
    current = Object.assign(new WorkOrder(), {
      id: 1,
      status: S.OPEN,
      teamId: null,
      version: 1,
    });
    orders.findOne.mockResolvedValue(current);
    orders.findOneByOrFail.mockResolvedValue(current);
    orders.createQueryBuilder.mockReturnValue(mutation);
    for (const method of ['update', 'where', 'andWhere'] as const)
      mutation[method].mockReturnValue(mutation);
    mutation.set.mockImplementation((data: Record<string, unknown>) => {
      changes = data;
      return mutation;
    });
    mutation.execute.mockImplementation(() => {
      Object.assign(
        current,
        Object.fromEntries(
          Object.entries(changes).filter(
            ([, value]) => typeof value !== 'function',
          ),
        ),
      );
      current.version += 1;
      return Promise.resolve({ affected: 1 });
    });
    orders.save.mockImplementation((row: WorkOrder) => Promise.resolve(row));
    orders.manager.transaction.mockImplementation(
      (work: (m: unknown) => unknown) =>
        work({
          getRepository: (entity: unknown) =>
            entity === WorkOrderStatusHistory
              ? history
              : entity === Team
                ? team
                : entity === WorkforceUser
                  ? people
                  : orders,
        }),
    );
    history.create.mockImplementation((row: object) => row);
    history.save.mockResolvedValue({});
    team.findOne.mockResolvedValue({ id: 2, isActive: true });
    people.createQueryBuilder.mockReturnValue(members);
    for (const key of [
      'select',
      'where',
      'andWhere',
      'orderBy',
      'setLock',
    ] as const)
      members[key].mockReturnValue(members);
    members.getMany.mockResolvedValue([{ id: 9 }]);
    service = new WorkOrdersService(orders as unknown as Repository<WorkOrder>);
  });
  it.each(allowed)(
    '%s → %s izinlidir ve tek transactionda geçmiş yazar',
    async (from, to) => {
      current.status = from;
      current.teamId = from === S.OPEN ? null : 2;
      const result = await change(to);
      expect(result.status).toBe(to);
      expect(result.version).toBe(2);
      expect(result.teamId).toBe(
        to === S.OPEN
          ? null
          : to === S.ASSIGNED
            ? 2
            : from === S.OPEN
              ? null
              : 2,
      );
      expect(history.create).toHaveBeenCalledWith({
        workOrderId: 1,
        fromStatus: from,
        toStatus: to,
        teamId: result.teamId,
        reason: 'neden',
        changedById: 7,
      });
      expect(history.save).toHaveBeenCalledOnce();
      expect(orders.manager.transaction).toHaveBeenCalledOnce();
    },
  );
  it.each(forbidden)('%s → %s 409 ve Türkçe mesaj verir', async (from, to) => {
    current.status = from;
    await expect(change(to)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: expect.stringMatching(
          /^İş emri .+ durumundan .+ durumuna alınamaz$/,
        ),
      },
    });
    expect(orders.save).not.toHaveBeenCalled();
    expect(history.save).not.toHaveBeenCalled();
  });
  it('API snapshotı değişmişse işlem yapmaz; dinamik yetki kontrolünün yarışı kapanır', async () => {
    current.status = S.IN_PROGRESS;
    await expect(
      change(S.CANCELLED, { expectedStatus: S.ASSIGNED }),
    ).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: 'Kayıt siz düzenlerken değişti, sayfayı yenileyin',
      },
    });
    expect(orders.save).not.toHaveBeenCalled();
  });
  it.each([undefined, '', '   '])(
    'iptalde neden zorunludur: %s',
    async (reason) => {
      await expect(change(S.CANCELLED, { reason })).rejects.toMatchObject({
        error: { statusCode: 400 },
      });
    },
  );
  it('neden en fazla 500 karakter olabilir', async () => {
    await expect(
      change(S.CANCELLED, { reason: 'a'.repeat(501) }),
    ).rejects.toMatchObject({ error: { statusCode: 400 } });
  });
  it('atamada ekip zorunludur', async () => {
    await expect(
      change(S.ASSIGNED, { teamId: undefined }),
    ).rejects.toMatchObject({ error: { statusCode: 400 } });
  });
  it('olmayan ekip 404 verir', async () => {
    team.findOne.mockResolvedValue(null);
    await expect(change(S.ASSIGNED)).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });
  it('pasif ekip 409 verir', async () => {
    team.findOne.mockResolvedValue({ id: 2, isActive: false });
    await expect(change(S.ASSIGNED)).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
  });
  it('aktif üyesiz ekip 409 verir', async () => {
    members.getMany.mockResolvedValue([]);
    await expect(change(S.ASSIGNED)).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
  });
  it('atama dışındaki hedeflerde sahte ekip IDsiyle ekip değişmez', async () => {
    current.status = S.ASSIGNED;
    current.teamId = 2;
    expect((await change(S.IN_PROGRESS, { teamId: 999 })).teamId).toBe(2);
  });
  it('geçmiş hatası yutulmaz; transaction rollback yapabilsin diye dışarı taşınır', async () => {
    const error = new Error('history failed');
    history.save.mockRejectedValue(error);
    await expect(change(S.ASSIGNED)).rejects.toBe(error);
  });
  it('kayıt yoksa 404 verir', async () => {
    orders.findOne.mockResolvedValue(null);
    await expect(change(S.ASSIGNED)).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });
  it('actor yoksa işlem yapılmaz', async () => {
    await expect(
      service.changeStatus(1, {
        id: 1,
        version: 1,
        status: S.CANCELLED,
        expectedStatus: S.OPEN,
        reason: 'neden',
      }),
    ).rejects.toMatchObject({ error: { statusCode: 401 } });
  });
  it('koşullu durum UPDATEi sıfır satır etkilerse geçmiş yazılmaz', async () => {
    mutation.execute.mockResolvedValue({ affected: 0 });
    await expect(change(S.ASSIGNED)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: 'Kayıt siz düzenlerken değişti, sayfayı yenileyin',
      },
    });
    expect(history.save).not.toHaveBeenCalled();
    expect(mutation.andWhere).toHaveBeenCalledWith('"version" = :version', {
      version: 1,
    });
    expect(mutation.andWhere).toHaveBeenCalledWith(
      '"status" = :expectedStatus',
      { expectedStatus: S.OPEN },
    );
  });
  it('eski sürümde durum ve geçmiş değişmez', async () => {
    await expect(change(S.ASSIGNED, { version: 99 })).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: 'Kayıt siz düzenlerken değişti, sayfayı yenileyin',
      },
    });
    expect(mutation.execute).not.toHaveBeenCalled();
    expect(history.save).not.toHaveBeenCalled();
  });
});