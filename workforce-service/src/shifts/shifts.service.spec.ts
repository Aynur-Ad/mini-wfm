import type { CreateShiftDto } from './dto/create-shift.dto.js';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThan, MoreThan, Not } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Shift } from './entities/shift.entity.js';
import { ShiftsService } from './shifts.service.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { requestContext } from '../common/logging/request-context.js';
import { AccountRole } from '../accounts/account-role.js';
import { validShiftDuration } from './calc/shift-interval.js';

const actor = { id: 7, username: 'planner', role: AccountRole.PLANNER };
const dto = {
  workforceUserId: 1,
  startAt: '2099-01-02T08:00:00+03:00',
  endAt: '2099-01-02T16:00:00+03:00',
  note: 'Gündüz',
};
function shift(): Shift {
  return Object.assign(new Shift(), {
    id: 10,
    workforceUserId: 1,
    startAt: new Date(dto.startAt),
    endAt: new Date(dto.endAt),
    note: 'Gündüz',
    createdById: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ShiftsService', () => {
  let service: ShiftsService;
  let current: Shift;
  const people = { findOne: vi.fn() };
  const repository = {
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    manager: { transaction: vi.fn() },
  };
  const create = (data: CreateShiftDto = dto) =>
    requestContext.run({ correlationId: 'shift-test', actor }, () =>
      service.create(data),
    );
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01T00:00:00Z'));
    current = shift();
    repository.manager.transaction.mockImplementation(
      (work: (manager: unknown) => unknown) =>
        work({
          getRepository: (entity: unknown) =>
            entity === WorkforceUser ? people : repository,
        }),
    );
    people.findOne.mockResolvedValue({ id: 1, isActive: true });
    repository.findOneBy.mockResolvedValue(current);
    repository.findOne.mockImplementation(({ lock }: { lock?: unknown }) =>
      Promise.resolve(lock ? current : null),
    );
    repository.create.mockImplementation((data: object) =>
      Object.assign(new Shift(), data),
    );
    repository.save.mockImplementation((data: Shift) => Promise.resolve(data));
    const module = await Test.createTestingModule({
      providers: [
        ShiftsService,
        { provide: getRepositoryToken(Shift), useValue: repository },
      ],
    }).compile();
    service = module.get(ShiftsService);
  });
  afterEach(() => vi.useRealTimers());

  it('oluşturanı actor üzerinden seçer, UTC anlarını ve note bilgisini korur', async () => {
    const result = await create();
    expect(result.createdById).toBe(actor.id);
    expect(result.startAt.toISOString()).toBe('2099-01-02T05:00:00.000Z');
    expect(repository.save).toHaveBeenCalledOnce();
    expect(people.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
  });
  it('note verilmezse null kaydeder; gövdedeki sahte createdById dikkate alınmaz', async () => {
    const { note: _note, ...data } = dto;
    const result = await create(Object.assign({}, data, { createdById: 999 }));
    expect(result.note).toBeNull();
    expect(result.createdById).toBe(7);
  });
  it('actor yoksa sessizce yanlış oluşturan atamak yerine isteği reddeder', async () => {
    await expect(service.create(dto)).rejects.toMatchObject({
      error: { statusCode: 401 },
    });
    expect(repository.save).not.toHaveBeenCalled();
  });
  it.each([
    ['aynı', '2099-01-02T05:00:00Z'],
    ['ters', '2099-01-02T04:00:00Z'],
    ['1 saatten kısa', '2099-01-02T05:59:59Z'],
    ['12 saatten uzun', '2099-01-02T17:00:01Z'],
    ['geçersiz', 'invalid'],
  ])('%s bitişte 400 verir', async (_name, endAt) => {
    await expect(create({ ...dto, endAt })).rejects.toMatchObject({
      error: { statusCode: 400 },
    });
    expect(repository.save).not.toHaveBeenCalled();
  });
  it.each(['2099-01-02T06:00:00Z', '2099-01-02T17:00:00Z'])(
    '1 ve 12 saat sınırını kabul eder: %s',
    async (endAt) => {
      await expect(create({ ...dto, endAt })).resolves.toBeDefined();
    },
  );
  it('geçersiz başlangıçta 400 verir', async () => {
    await expect(create({ ...dto, startAt: 'invalid' })).rejects.toMatchObject({
      error: { statusCode: 400 },
    });
  });
  it('geçmişe eklemeyi 409 ile reddeder', async () => {
    await expect(
      create({
        ...dto,
        startAt: '2098-12-31T08:00:00Z',
        endAt: '2098-12-31T16:00:00Z',
      }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
  });
  it('personel yoksa 404 verir', async () => {
    people.findOne.mockResolvedValue(null);
    await expect(create()).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });
  it.each(['create', 'update', 'remove'] as const)(
    'pasif personelde %s 409 verir',
    async (operation) => {
      people.findOne.mockResolvedValue({ id: 1, isActive: false });
      const result =
        operation === 'create'
          ? create()
          : operation === 'update'
            ? service.update(10, { id: 10, note: 'Yeni' })
            : service.remove(10);
      await expect(result).rejects.toMatchObject({
        error: { statusCode: 409 },
      });
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );
  it('çakışmada 409 mesajında çakışan saatleri gösterir', async () => {
    repository.findOne.mockResolvedValue(current);
    await expect(create()).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: expect.stringContaining('2099-01-02T05:00:00.000Z'),
      },
    });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        workforceUserId: 1,
        startAt: LessThan(new Date(dto.endAt)),
        endAt: MoreThan(new Date(dto.startAt)),
      },
      order: { startAt: 'ASC', id: 'ASC' },
    });
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('kendi saatleriyle güncellerken kendi ID bilgisini çakışma dışında bırakır', async () => {
    await service.update(10, {
      id: 10,
      startAt: dto.startAt,
      endAt: dto.endAt,
    });
    expect(repository.findOne).toHaveBeenLastCalledWith({
      where: {
        workforceUserId: 1,
        startAt: LessThan(new Date(dto.endAt)),
        endAt: MoreThan(new Date(dto.startAt)),
        id: Not(10),
      },
      order: { startAt: 'ASC', id: 'ASC' },
    });
    expect(repository.save).toHaveBeenCalledOnce();
  });
  it('tek tarih değişiminde diğer tarih ve createdById korunur; note null temizlenir', async () => {
    const result = await service.update(10, {
      id: 10,
      startAt: '2099-01-02T04:00:00Z',
      note: null,
    });
    expect(result.endAt).toEqual(new Date(dto.endAt));
    expect(result.createdById).toBe(7);
    expect(result.note).toBeNull();
  });
  it('PATCH birleşmiş tarihlerde süre kuralını tekrar uygular', async () => {
    await expect(
      service.update(10, { id: 10, endAt: '2099-01-02T04:00:00Z' }),
    ).rejects.toMatchObject({ error: { statusCode: 400 } });
  });
  it('güncellemede başka vardiyayla çakışmayı reddeder', async () => {
    repository.findOne.mockResolvedValue(current);
    await expect(
      service.update(10, { id: 10, note: 'Yeni' }),
    ).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: expect.stringContaining('Vardiya çakışması'),
      },
    });
  });
  it('gelecekteki vardiyayı geçmişe taşımayı reddeder', async () => {
    await expect(
      service.update(10, {
        id: 10,
        startAt: '2098-12-31T05:00:00Z',
        endAt: '2098-12-31T13:00:00Z',
      }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
  });
  it.each(['update', 'remove'] as const)(
    'başlamış vardiyada %s reddedilir',
    async (operation) => {
      current.startAt = new Date('2098-12-31T05:00:00Z');
      const result =
        operation === 'update'
          ? service.update(10, {
              id: 10,
              startAt: dto.startAt,
              endAt: dto.endAt,
            })
          : service.remove(10);
      await expect(result).rejects.toMatchObject({
        error: { statusCode: 409 },
      });
    },
  );
  it('gelecekteki vardiyayı siler ve TCP yanıtını korur', async () => {
    expect(await service.remove(10)).toEqual({ deleted: true, id: 10 });
    expect(repository.remove).toHaveBeenCalledWith(current);
  });
  it.each(['findOne', 'update', 'remove'] as const)(
    'olmayan vardiyada %s 404 verir',
    async (operation) => {
      repository.findOneBy.mockResolvedValue(null);
      const result =
        operation === 'findOne'
          ? service.findOne(99)
          : operation === 'update'
            ? service.update(99, { id: 99 })
            : service.remove(99);
      await expect(result).rejects.toMatchObject({
        error: { statusCode: 404 },
      });
    },
  );
  it('tek kaydı tarihlerle getirir', async () => {
    expect(await service.findOne(10)).toBe(current);
  });
  it('personel değişiminde kilitleri kimlik sırasıyla alır', async () => {
    current.workforceUserId = 5;
    await service.update(10, { id: 10, workforceUserId: 2 });
    expect(
      people.findOne.mock.calls.map(([options]) => options.where.id),
    ).toEqual([2, 5]);
    expect(current.workforceUserId).toBe(2);
  });
  it('kilit beklerken personeli değişen vardiyada stale işlem yapmaz', async () => {
    repository.findOneBy.mockResolvedValue(Object.assign({}, current));
    current.workforceUserId = 3;
    await expect(service.remove(10)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        message: expect.stringContaining('başka bir istekte'),
      },
    });
    expect(repository.remove).not.toHaveBeenCalled();
  });
  it('beklenmeyen DB hatasını iş kuralı hatası olarak gizlemez', async () => {
    const error = new Error('connection lost');
    repository.save.mockRejectedValue(error);
    await expect(create()).rejects.toBe(error);
  });
});

describe('vardiya süresi saf hesabı', () => {
  it('geçersiz Date nesnesini reddeder', () => {
    expect(validShiftDuration(new Date('invalid'), new Date())).toBe(false);
  });
});