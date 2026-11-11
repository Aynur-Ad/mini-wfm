import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { Shift } from '../shifts/entities/shift.entity.js';
import { ShiftsService } from '../shifts/shifts.service.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { WorkforceUsersService } from '../workforce_users/workforce_users.service.js';
import { Account } from '../accounts/entities/account.entity.js';
import { AccountRole } from '../accounts/account-role.js';
import { requestContext } from '../common/logging/request-context.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';
import type { CreateShiftDto } from '../shifts/dto/create-shift.dto.js';

const HOUR = 3_600_000;

describe('ShiftsService — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined;
  let service: ShiftsService;
  let peopleService: WorkforceUsersService;
  let personId: number;
  let otherId: number;
  let adminId: number;
  let base: number;

  const stamp = (hours: number) => new Date(base + hours * HOUR).toISOString();
  const create = (start = 8, end = 16, workforceUserId = personId) =>
    requestContext.run(
      {
        correlationId: 'shift-integration',
        actor: {
          id: adminId,
          username: 'initial_admin',
          role: AccountRole.ADMIN,
        },
      },
      () =>
        service.create({
          workforceUserId,
          startAt: stamp(start),
          endAt: stamp(end),
        }),
    );

  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    const runner = database.dataSource.createQueryRunner();
    try {
      if (!(await runner.hasTable('workforce.shift')))
        throw new Error(
          'Önce terminalden CreateShiftTable migration dosyasını oluşturun; test helper gerçek migration dosyalarını çalıştırır.',
        );
    } finally {
      await runner.release();
    }
    service = new ShiftsService(database.dataSource.getRepository(Shift));
    peopleService = new WorkforceUsersService(
      database.dataSource.getRepository(WorkforceUser),
    );
  });
  beforeEach(async () => {
    if (!database) throw new Error('Test veritabanı hazırlanmadı');
    base = Math.ceil(Date.now() / (24 * HOUR)) * 24 * HOUR + 48 * HOUR;
    const people = database.dataSource.getRepository(WorkforceUser);
    personId = (
      await people.save({
        firstName: 'Deniz',
        lastName: 'Kaya',
        registrationNumber: 'SHIFT-A',
      })
    ).id;
    otherId = (
      await people.save({
        firstName: 'Ece',
        lastName: 'Ak',
        registrationNumber: 'SHIFT-B',
      })
    ).id;
    adminId = (
      await database.dataSource
        .getRepository(Account)
        .findOneByOrFail({ username: database.initialAdmin.username })
    ).id;
  });
  afterEach(async () => {
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });

  it.each([
    [10, 18],
    [6, 10],
    [9, 15],
    [6, 18],
    [8, 16],
  ])(
    '%s–%s çakışması PostgreSQL aralık sorgusuyla 409 verir',
    async (start, end) => {
      await create();
      await expect(create(start, end)).rejects.toMatchObject({
        error: { statusCode: 409, message: expect.stringContaining(stamp(8)) },
      });
      expect(await database!.dataSource.getRepository(Shift).count()).toBe(1);
    },
  );
  it.each([
    [16, 22],
    [2, 8],
  ])('uç uca %s–%s vardiyası çakışmaz', async (start, end) => {
    await create();
    await create(start, end);
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(2);
  });
  it('farklı personelde aynı saatlere izin verir', async () => {
    await create();
    await create(8, 16, otherId);
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(2);
  });
  it('kendi saatleriyle PATCH çakışma üretmez; birleşmiş alanlar korunur', async () => {
    const item = await create();
    const updated = await service.update(item.id, {
      id: item.id,
      startAt: stamp(8),
      endAt: stamp(16),
    });
    expect(updated.id).toBe(item.id);
    expect(updated.createdById).toBe(adminId);
    expect(
      (
        await service.update(item.id, { id: item.id, startAt: stamp(7) })
      ).endAt.toISOString(),
    ).toBe(stamp(16));
  });
  it('PATCH başka vardiyayla çakışırsa kaydı değiştirmez', async () => {
    const item = await create();
    await create(16, 22);
    await expect(
      service.update(item.id, { id: item.id, endAt: stamp(17) }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
    expect((await service.findOne(item.id)).endAt.toISOString()).toBe(
      stamp(16),
    );
  });
  it('personel değişiminde hedef personelin vardiyasını da kontrol eder', async () => {
    const item = await create();
    await create(8, 16, otherId);
    await expect(
      service.update(item.id, { id: item.id, workforceUserId: otherId }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
    expect((await service.findOne(item.id)).workforceUserId).toBe(personId);
  });
  it('eşzamanlı iki çakışan create isteğinden yalnızca biri kaydolur', async () => {
    const results = await Promise.allSettled([create(8, 16), create(10, 18)]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: { error: { statusCode: 409 } },
    });
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(1);
  });
  it('eşzamanlı iki update aynı personele çakışan saatler yazamaz', async () => {
    const a = await create(2, 8);
    const b = await create(16, 22);
    const results = await Promise.allSettled([
      service.update(a.id, { id: a.id, startAt: stamp(9), endAt: stamp(15) }),
      service.update(b.id, { id: b.id, startAt: stamp(10), endAt: stamp(16) }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === 'rejected'),
    ).toMatchObject({ reason: { error: { statusCode: 409 } } });
  });
  it('vardiyası olan personel service ile ve doğrudan DELETE ile korunur', async () => {
    await create();
    await expect(peopleService.remove(personId)).rejects.toMatchObject({
      error: { statusCode: 409, message: 'Vardiyası olan personel silinemez' },
    });
    await expect(
      database!.dataSource.getRepository(WorkforceUser).delete(personId),
    ).rejects.toMatchObject({
      driverError: { code: '23503', constraint: 'FK_shift_workforce_user' },
    });
  });
  it('son vardiya kaldırılınca personel silinebilir', async () => {
    const item = await create();
    await service.remove(item.id);
    await expect(peopleService.remove(personId)).resolves.toMatchObject({
      deleted: true,
    });
  });
  it('offset ile alınan tarih aynı UTC anıyla döner; note null ve creator korunur', async () => {
    const dto: CreateShiftDto = {
      workforceUserId: personId,
      startAt: stamp(8).replace('Z', '+00:00'),
      endAt: stamp(16),
      note: 'Gece değil',
    };
    const item = await requestContext.run(
      {
        correlationId: 'offset',
        actor: {
          id: adminId,
          username: 'initial_admin',
          role: AccountRole.ADMIN,
        },
      },
      () => service.create(dto),
    );
    const updated = await service.update(item.id, { id: item.id, note: null });
    expect(updated.note).toBeNull();
    expect(updated.createdById).toBe(adminId);
    expect((await service.findOne(item.id)).startAt.toISOString()).toBe(
      stamp(8),
    );
  });
  it.each([0.5, 12.5, -1])(
    'DB CHECK doğrudan yazılan %s saatlik süreyi de reddeder',
    async (hours) => {
      await expect(
        database!.dataSource
          .getRepository(Shift)
          .insert({
            workforceUserId: personId,
            createdById: adminId,
            startAt: new Date(stamp(8)),
            endAt: new Date(stamp(8 + hours)),
          }),
      ).rejects.toMatchObject({
        driverError: { code: '23514', constraint: 'CHK_shift_duration' },
      });
    },
  );
  it('pasif personelin create isteğini kaydetmez', async () => {
    await database!.dataSource
      .getRepository(WorkforceUser)
      .update(personId, { isActive: false });
    await expect(create()).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
    expect(await database!.dataSource.getRepository(Shift).count()).toBe(0);
  });
  it('başlamış vardiya geleceğe taşınamaz veya silinemez', async () => {
    const item = await database!.dataSource
      .getRepository(Shift)
      .save({
        workforceUserId: personId,
        createdById: adminId,
        startAt: new Date(Date.now() - 2 * HOUR),
        endAt: new Date(Date.now() + 2 * HOUR),
      });
    await expect(
      service.update(item.id, {
        id: item.id,
        startAt: stamp(8),
        endAt: stamp(16),
      }),
    ).rejects.toMatchObject({ error: { statusCode: 409 } });
    await expect(service.remove(item.id)).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
  });
});