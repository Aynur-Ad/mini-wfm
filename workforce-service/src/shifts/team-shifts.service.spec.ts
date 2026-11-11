import { In, LessThan, MoreThan } from 'typeorm';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ShiftsService } from './shifts.service.js';
import { Shift } from './entities/shift.entity.js';
import type { Repository } from 'typeorm';
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { requestContext } from '../common/logging/request-context.js';
import { AccountRole } from '../accounts/account-role.js';

const actor = { id: 7, username: 'planner', role: AccountRole.PLANNER };
const dto = {
  teamId: 2,
  startAt: '2099-01-02T08:00:00+03:00',
  endAt: '2099-01-02T16:00:00+03:00',
  note: 'Toplu',
};
const members = [
  { id: 1, firstName: 'Deniz', lastName: 'Kaya', registrationNumber: 'P1' },
  { id: 2, firstName: 'Ece', lastName: 'Ak', registrationNumber: 'P2' },
  { id: 3, firstName: 'Ali', lastName: 'Yılmaz', registrationNumber: 'P3' },
];

describe('Ekibe toplu vardiya — ShiftsService', () => {
  let service: ShiftsService;
  const teams = { findOne: vi.fn() };
  const builder = {
    select: vi.fn(),
    where: vi.fn(),
    andWhere: vi.fn(),
    orderBy: vi.fn(),
    setLock: vi.fn(),
    getMany: vi.fn(),
  };
  const people = { createQueryBuilder: vi.fn() };
  const transactionRepository = {
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };
  const transaction = vi.fn();
  const outer = { manager: { transaction }, save: vi.fn(), create: vi.fn() };
  const run = (data = dto) =>
    requestContext.run({ correlationId: 'bulk-test', actor }, () =>
      service.createForTeam(data.teamId, data),
    );

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01T00:00:00Z'));
    transaction.mockImplementation((work: (manager: unknown) => unknown) =>
      work({
        getRepository: (entity: unknown) =>
          entity === Team
            ? teams
            : entity === WorkforceUser
              ? people
              : transactionRepository,
      }),
    );
    teams.findOne.mockResolvedValue({ id: 2, isActive: true });
    people.createQueryBuilder.mockReturnValue(builder);
    for (const key of [
      'select',
      'where',
      'andWhere',
      'orderBy',
      'setLock',
    ] as const)
      builder[key].mockReturnValue(builder);
    builder.getMany.mockResolvedValue(members);
    transactionRepository.find.mockResolvedValue([]);
    transactionRepository.create.mockImplementation((row: object) =>
      Object.assign(new Shift(), row),
    );
    transactionRepository.save.mockImplementation((rows: Shift[]) =>
      Promise.resolve(rows),
    );
    service = new ShiftsService(outer as unknown as Repository<Shift>);
  });
  afterEach(() => vi.useRealTimers());

  it('bütün kayıtları aynı transaction manager üzerinden ve actor ID ile oluşturur', async () => {
    const result = await run();
    expect(result.map((row) => row.workforceUserId)).toEqual([1, 2, 3]);
    expect(
      result.every((row) => row.createdById === 7 && row.note === 'Toplu'),
    ).toBe(true);
    expect(transaction).toHaveBeenCalledOnce();
    expect(transactionRepository.save).toHaveBeenCalledOnce();
    expect(outer.save).not.toHaveBeenCalled();
    expect(teams.findOne).toHaveBeenCalledWith({
      where: { id: 2 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(builder.where).toHaveBeenCalledWith('person.teamId = :teamId', {
      teamId: 2,
    });
    expect(builder.andWhere).toHaveBeenCalledWith(
      'person.isActive = :isActive',
      { isActive: true },
    );
    expect(builder.orderBy).toHaveBeenCalledWith('person.id', 'ASC');
    expect(builder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(teams.findOne.mock.invocationCallOrder[0]).toBeLessThan(
      builder.getMany.mock.invocationCallOrder[0],
    );
  });
  it('tüm çakışan personelleri birer kez listeler; hiçbir save çalışmaz', async () => {
    transactionRepository.find.mockResolvedValue([
      { workforceUserId: 1 },
      { workforceUserId: 1 },
      { workforceUserId: 3 },
    ]);
    await expect(run()).rejects.toMatchObject({
      error: {
        statusCode: 409,
        details: [
          {
            workforceUserId: 1,
            registrationNumber: 'P1',
            firstName: 'Deniz',
            lastName: 'Kaya',
          },
          {
            workforceUserId: 3,
            registrationNumber: 'P3',
            firstName: 'Ali',
            lastName: 'Yılmaz',
          },
        ],
      },
    });
    expect(transactionRepository.save).not.toHaveBeenCalled();
    expect(transactionRepository.create).not.toHaveBeenCalled();
  });
  it('çakışmayı bütün üye IDleri için tek sorguda, eşit sınırları hariç tutarak arar', async () => {
    await run();
    expect(transactionRepository.find).toHaveBeenCalledWith({
      select: { workforceUserId: true },
      where: {
        workforceUserId: In([1, 2, 3]),
        startAt: LessThan(new Date(dto.endAt)),
        endAt: MoreThan(new Date(dto.startAt)),
      },
    });
  });
  it('yalnızca seçilen aktif üyeler için kayıt hazırlar', async () => {
    builder.getMany.mockResolvedValue([members[1]]);
    const result = await run();
    expect(result).toHaveLength(1);
    expect(result[0].workforceUserId).toBe(2);
  });
  it('note yoksa null, sahte createdById yerine actor kullanılır', async () => {
    const data = Object.assign({}, dto, { note: undefined, createdById: 999 });
    const result = await requestContext.run(
      { correlationId: 'bulk-test', actor },
      () => service.createForTeam(2, data),
    );
    expect(
      result.every((row) => row.note === null && row.createdById === 7),
    ).toBe(true);
  });
  it('ekip yoksa 404, pasifse 409 döner', async () => {
    teams.findOne.mockResolvedValue(null);
    await expect(run()).rejects.toMatchObject({ error: { statusCode: 404 } });
    teams.findOne.mockResolvedValue({ id: 2, isActive: false });
    await expect(run()).rejects.toMatchObject({ error: { statusCode: 409 } });
    expect(builder.getMany).not.toHaveBeenCalled();
  });
  it('aktif üye yoksa 409 verir', async () => {
    builder.getMany.mockResolvedValue([]);
    await expect(run()).rejects.toMatchObject({ error: { statusCode: 409 } });
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });
  it('geçmişe atamayı reddeder', async () => {
    await expect(
      run({
        ...dto,
        startAt: '2098-12-31T08:00:00Z',
        endAt: '2098-12-31T16:00:00Z',
      }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
  });
  it.each([
    '2099-01-02T05:00:00Z',
    '2099-01-02T04:00:00Z',
    '2099-01-02T05:30:00Z',
    '2099-01-02T18:00:00Z',
    'invalid',
  ])('hatalı süre/bitiş için 400 döner: %s', async (endAt) => {
    await expect(run({ ...dto, endAt })).rejects.toMatchObject({
      error: { statusCode: 400 },
    });
    expect(transaction).not.toHaveBeenCalled();
  });
  it('actor yoksa 401 döner ve transaction açılmaz', async () => {
    await expect(service.createForTeam(2, dto)).rejects.toMatchObject({
      error: { statusCode: 401 },
    });
    expect(transaction).not.toHaveBeenCalled();
  });
  it('DB save hatasını yutmaz; transaction rollback yapabilsin diye dışarı taşır', async () => {
    const error = new Error('write failed');
    transactionRepository.save.mockRejectedValue(error);
    await expect(run()).rejects.toBe(error);
  });
});