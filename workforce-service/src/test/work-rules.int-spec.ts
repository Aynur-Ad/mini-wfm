import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { ShiftsService } from '../shifts/shifts.service.js';
import { Shift } from '../shifts/entities/shift.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { Account } from '../accounts/entities/account.entity.js';
import { AccountRole } from '../accounts/account-role.js';
import { Team } from '../teams/entities/team.entity.js';
import { requestContext } from '../common/logging/request-context.js';
import { DEFAULT_WORK_RULE_OPTIONS } from '../config/work-rules.config.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';
const HOUR = 3_600_000,
  DAY = 24 * HOUR;

describe('Vardiya çalışma kuralları — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined;
  let service: ShiftsService;
  let person: WorkforceUser, other: WorkforceUser, team: Team;
  let actor: { id: number; username: string; role: AccountRole };
  let monday: number;
  const stamp = (day: number, hour: number) =>
    new Date(monday + day * DAY + hour * HOUR).toISOString();
  const run = <T>(work: () => Promise<T>) =>
    requestContext.run({ correlationId: 'rules-int', actor }, work);
  const create = (day: number, start: number, end: number, id = person.id) =>
    run(() =>
      service.create({
        workforceUserId: id,
        startAt: stamp(day, start),
        endAt: stamp(day, end),
      }),
    );
  const bulk = (day: number, start: number, end: number) =>
    run(() =>
      service.createForTeam(team.id, {
        teamId: team.id,
        startAt: stamp(day, start),
        endAt: stamp(day, end),
      }),
    );
  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    service = new ShiftsService(
      database.dataSource.getRepository(Shift),
      DEFAULT_WORK_RULE_OPTIONS,
    );
  });
  beforeEach(async () => {
    const ds = database!.dataSource;
    const future = new Date(Date.now() + 14 * DAY + 3 * HOUR);
    monday =
      Date.UTC(
        future.getUTCFullYear(),
        future.getUTCMonth(),
        future.getUTCDate() - ((future.getUTCDay() + 6) % 7),
      ) -
      3 * HOUR;
    const account = await ds
      .getRepository(Account)
      .findOneByOrFail({ username: database!.initialAdmin.username });
    actor = {
      id: account.id,
      username: account.username,
      role: AccountRole.ADMIN,
    };
    team = await ds.getRepository(Team).save({ name: 'Kural Ekibi' });
    [person, other] = await ds.getRepository(WorkforceUser).save([
      {
        firstName: 'Deniz',
        lastName: 'Kaya',
        registrationNumber: 'RULE-A',
        teamId: team.id,
      },
      {
        firstName: 'Ece',
        lastName: 'Ak',
        registrationNumber: 'RULE-B',
        teamId: team.id,
      },
    ]);
  });
  afterEach(async () => {
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });
  it('6 saat REST hatasında ilgili vardiyaları ve hesaplanan değeri döndürür, kayıt eklemez', async () => {
    const first = await create(0, 8, 16);
    await expect(create(0, 22, 30)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        details: [
          expect.objectContaining({
            code: 'REST',
            value: 6,
            actualMinutes: 360,
            workforceUserId: person.id,
            shifts: [
              expect.objectContaining({ id: first.id, source: 'existing' }),
              expect.objectContaining({ source: 'new' }),
            ],
            message: expect.stringContaining('6 saat'),
          }),
        ],
      },
    });
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(1);
  });
  it('tam 11 saat dinlenmede yeni kayıt kabul edilir', async () => {
    await create(0, 8, 16);
    await create(1, 3, 11);
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(2);
  });
  it('haftalık 66 saat reddedilir, 60 saat kabul edilir', async () => {
    for (let day = 0; day < 5; day++) await create(day, 7, 18);
    await expect(create(5, 7, 18)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        details: [
          expect.objectContaining({
            code: 'WEEKLY_LIMIT',
            value: 66,
            actualMinutes: 3960,
          }),
        ],
      },
    });
    await create(5, 7, 12);
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(6);
  });
  it('7 ardışık gün reddedilir; iki kural arasında farklı limitler korunur', async () => {
    for (let day = 0; day < 6; day++) await create(day, 9, 13);
    await expect(create(6, 9, 13)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        details: [
          expect.objectContaining({
            code: 'CONSECUTIVE_DAYS',
            value: 7,
            limit: 6,
          }),
        ],
      },
    });
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(6);
  });
  it('PATCH kendi eski halini dışlar; diğer vardiyayla azalan dinlenmeyi reddeder', async () => {
    const first = await create(0, 8, 16);
    await create(1, 3, 11);
    expect(
      (await service.update(first.id, { id: first.id, note: 'Aynı saatler' }))
        .note,
    ).toBe('Aynı saatler');
    await expect(
      service.update(first.id, { id: first.id, endAt: stamp(0, 17) }),
    ).rejects.toMatchObject({
      error: {
        statusCode: 409,
        details: [expect.objectContaining({ code: 'REST', value: 10 })],
      },
    });
    expect((await service.findOne(first.id)).endAt.toISOString()).toBe(
      stamp(0, 16),
    );
  });
  it('personeli değiştirirken hedef personelin çalışma kuralları kontrol edilir', async () => {
    await create(0, 8, 16, other.id);
    const first = await create(0, 22, 30);
    await expect(
      service.update(first.id, { id: first.id, workforceUserId: other.id }),
    ).rejects.toMatchObject({
      error: {
        statusCode: 409,
        details: [
          expect.objectContaining({
            code: 'REST',
            workforceUserId: other.id,
            value: 6,
          }),
        ],
      },
    });
    expect((await service.findOne(first.id)).workforceUserId).toBe(person.id);
  });
  it('toplu atamada bir üyenin REST ihlali tüm atamayı engeller, kimliği details içindedir', async () => {
    await create(0, 8, 16);
    await expect(bulk(0, 22, 30)).rejects.toMatchObject({
      error: {
        statusCode: 409,
        details: [
          expect.objectContaining({
            code: 'REST',
            workforceUserId: person.id,
            registrationNumber: 'RULE-A',
            firstName: 'Deniz',
            value: 6,
          }),
        ],
      },
    });
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(1);
    expect(
      await database!.dataSource
        .getRepository(Shift)
        .countBy({ workforceUserId: other.id }),
    ).toBe(0);
  });
  it('toplu atama tam 11 saat dinlenmede bütün üyelere yapılır', async () => {
    await create(0, 8, 16);
    expect(await bulk(1, 3, 11)).toHaveLength(2);
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(3);
  });
  it('paralel çakışmayan ama RESTe aykırı iki isteğin yalnız biri kaydolur', async () => {
    const result = await Promise.allSettled([
      create(0, 8, 16),
      create(0, 22, 30),
    ]);
    expect(result.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(result.find((item) => item.status === 'rejected')).toMatchObject({
      reason: {
        error: {
          statusCode: 409,
          details: [expect.objectContaining({ code: 'REST', value: 6 })],
        },
      },
    });
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(1);
  });
  it('hafta sınırı gece vardiyasının 2/6 saatini ayrı haftalara yazar', async () => {
    service = new ShiftsService(database!.dataSource.getRepository(Shift), {
      ...DEFAULT_WORK_RULE_OPTIONS,
      maxWeeklyHours: 1,
    });
    try {
      await expect(create(6, 22, 30)).rejects.toMatchObject({
        error: {
          statusCode: 409,
          details: [
            expect.objectContaining({
              code: 'WEEKLY_LIMIT',
              value: 2,
              actualMinutes: 120,
            }),
            expect.objectContaining({
              code: 'WEEKLY_LIMIT',
              value: 6,
              actualMinutes: 360,
            }),
          ],
        },
      });
      expect(await database!.dataSource.getRepository(Shift).count()).toBe(0);
    } finally {
      service = new ShiftsService(
        database!.dataSource.getRepository(Shift),
        DEFAULT_WORK_RULE_OPTIONS,
      );
    }
  });
  it('kontrol penceresinin dışındaki eski vardiya yeni işleme karışmaz', async () => {
    await database!.dataSource
      .getRepository(Shift)
      .insert({
        workforceUserId: person.id,
        createdById: actor.id,
        startAt: new Date(stamp(-20, 8)),
        endAt: new Date(stamp(-20, 16)),
      });
    expect(await create(0, 8, 16)).toBeDefined();
  });
});