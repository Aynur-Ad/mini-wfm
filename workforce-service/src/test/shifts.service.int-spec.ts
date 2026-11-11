import { vi } from 'vitest';
import { Team } from '../teams/entities/team.entity.js';
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
        database!.dataSource.getRepository(Shift).insert({
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
    const item = await database!.dataSource.getRepository(Shift).save({
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
  describe('Vardiya listesi', () => {
    const list = (
      from: number,
      to: number,
      filter: { workforceUserId?: number; teamId?: number } = {},
    ) => service.findAll({ from: stamp(from), to: stamp(to), ...filter });

    it.each([
      [16, 20, false],
      [4, 8, false],
      [8, 16, true],
      [9, 15, true],
      [4, 12, true],
      [12, 20, true],
      [4, 20, true],
    ])(
      '[%s, %s) aralık sınırında beklenen dahil olma: %s',
      async (from, to, included) => {
        const item = await create(8, 16);
        const result = await list(from, to);
        expect(result.map((row) => row.id)).toEqual(included ? [item.id] : []);
      },
    );

    it('23:00–07:00 vardiyasını her iki günün sorgusuna dahil eder', async () => {
      const item = await create(23, 31);
      expect((await list(0, 24)).map((row) => row.id)).toEqual([item.id]);
      expect((await list(24, 48)).map((row) => row.id)).toEqual([item.id]);
    });

    it('startAt artan, eşitlikte ID artan sıralama uygular', async () => {
      const late = await create(10, 18);
      const early = await create(8, 9);
      const sameStart = await create(8, 16, otherId);
      expect((await list(0, 24)).map((row) => row.id)).toEqual([
        early.id,
        sameStart.id,
        late.id,
      ]);
    });

    it('personel ve ekip filtrelerini ayrı ayrı ve birlikte AND ile uygular', async () => {
      const teams = database!.dataSource.getRepository(Team);
      const a = await teams.save({ name: 'Sorgu Ekibi A' });
      const b = await teams.save({ name: 'Sorgu Ekibi B' });
      const people = database!.dataSource.getRepository(WorkforceUser);
      await people.update(personId, { teamId: a.id });
      await people.update(otherId, { teamId: b.id });
      const first = await create();
      const second = await create(8, 16, otherId);
      expect(
        (await list(0, 24, { teamId: a.id })).map((row) => row.id),
      ).toEqual([first.id]);
      expect(
        (await list(0, 24, { workforceUserId: otherId })).map((row) => row.id),
      ).toEqual([second.id]);
      expect(
        (await list(0, 24, { workforceUserId: personId, teamId: a.id })).map(
          (row) => row.id,
        ),
      ).toEqual([first.id]);
      expect(
        await list(0, 24, { workforceUserId: personId, teamId: b.id }),
      ).toEqual([]);
    });

    it('ekibi olmayan personeli kaybetmez, ekip alanını null döndürür', async () => {
      await create();
      const result = await list(0, 24);
      expect(result[0].workforceUser).toMatchObject({
        id: personId,
        firstName: 'Deniz',
        lastName: 'Kaya',
        team: null,
      });
      expect(Object.keys(result[0].workforceUser).sort()).toEqual([
        'firstName',
        'id',
        'lastName',
        'team',
      ]);
    });

    it('ekip değiştirilince eski vardiya da güncel ekip filtresine geçer', async () => {
      const teams = database!.dataSource.getRepository(Team);
      const a = await teams.save({ name: 'Önceki Ekip' });
      const b = await teams.save({ name: 'Güncel Ekip' });
      const people = database!.dataSource.getRepository(WorkforceUser);
      await people.update(personId, { teamId: a.id });
      const item = await create();
      await people.update(personId, { teamId: b.id });
      expect(await list(0, 24, { teamId: a.id })).toEqual([]);
      const result = await list(0, 24, { teamId: b.id });
      expect(result.map((row) => row.id)).toEqual([item.id]);
      expect(result[0].workforceUser.team).toEqual({ id: b.id, name: b.name });
    });

    it('personel pasife alınsa da kayıtlı vardiyaları listeler', async () => {
      const item = await create();
      await database!.dataSource
        .getRepository(WorkforceUser)
        .update(personId, { isActive: false });
      expect((await list(0, 24)).map((row) => row.id)).toEqual([item.id]);
    });

    it('çok kayıt olsa da liste, personel ve ekip için tek SELECT çalıştırır', async () => {
      await create(8, 16);
      await create(16, 22);
      await create(8, 16, otherId);
      const spy = vi.spyOn(database!.dataSource.logger, 'logQuery');
      try {
        const result = await list(0, 24);
        expect(result).toHaveLength(3);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toContain('JOIN');
      } finally {
        spy.mockRestore();
      }
    });

    it('tam 31 günü kabul eder, 31 gün + 1 ms ve 40 günü reddeder', async () => {
      await expect(list(0, 31 * 24)).resolves.toEqual([]);
      await expect(
        service.findAll({
          from: stamp(0),
          to: new Date(base + 31 * 24 * HOUR + 1).toISOString(),
        }),
      ).rejects.toMatchObject({ error: { statusCode: 400 } });
      await expect(list(0, 40 * 24)).rejects.toMatchObject({
        error: { statusCode: 400 },
      });
    });
  });
  describe('Ekibe toplu vardiya — transaction', () => {
    let team: Team;
    let thirdId: number;
    let inactiveId: number;
    const bulk = (start = 8, end = 16) =>
      requestContext.run(
        {
          correlationId: 'team-bulk-integration',
          actor: {
            id: adminId,
            username: 'initial_admin',
            role: AccountRole.ADMIN,
          },
        },
        () =>
          service.createForTeam(team.id, {
            teamId: team.id,
            startAt: stamp(start),
            endAt: stamp(end),
            note: 'Toplu test',
          }),
      );

    beforeEach(async () => {
      const people = database!.dataSource.getRepository(WorkforceUser);
      team = await database!.dataSource
        .getRepository(Team)
        .save({ name: 'Toplu Vardiya Ekibi' });
      await people.update(personId, { teamId: team.id });
      await people.update(otherId, { teamId: team.id });
      thirdId = (
        await people.save({
          firstName: 'Ali',
          lastName: 'Yılmaz',
          registrationNumber: 'SHIFT-C',
          teamId: team.id,
        })
      ).id;
      inactiveId = (
        await people.save({
          firstName: 'Can',
          lastName: 'Işık',
          registrationNumber: 'SHIFT-D',
          teamId: team.id,
          isActive: false,
        })
      ).id;
    });

    it('tüm aktif üyelere oluşturur, pasif üyeyi hariç tutar ve actor ID kullanır', async () => {
      const result = await bulk();
      expect(result.map((row) => row.workforceUserId)).toEqual([
        personId,
        otherId,
        thirdId,
      ]);
      expect(
        result.every(
          (row) => row.createdById === adminId && row.note === 'Toplu test',
        ),
      ).toBe(true);
      expect(
        await database!.dataSource
          .getRepository(Shift)
          .countBy({ workforceUserId: inactiveId }),
      ).toBe(0);
      expect(await database!.dataSource.getRepository(Shift).count()).toBe(3);
    });

    it('bir üye çakışıyorsa diğer iki üyeye de hiçbir vardiya eklemez', async () => {
      const previous = await create(8, 16, otherId);
      await expect(bulk()).rejects.toMatchObject({
        error: {
          statusCode: 409,
          details: [
            {
              workforceUserId: otherId,
              registrationNumber: 'SHIFT-B',
              firstName: 'Ece',
              lastName: 'Ak',
            },
          ],
        },
      });
      const rows = await database!.dataSource.getRepository(Shift).find();
      expect(rows.map((row) => row.id)).toEqual([previous.id]);
      expect(
        await database!.dataSource
          .getRepository(Shift)
          .countBy({ workforceUserId: personId }),
      ).toBe(0);
      expect(
        await database!.dataSource
          .getRepository(Shift)
          .countBy({ workforceUserId: thirdId }),
      ).toBe(0);
    });

    it('bütün çakışan üyeleri döndürür; aynı kişinin iki vardiyası details kaydını çoğaltmaz', async () => {
      await create(8, 10, personId);
      await create(12, 14, personId);
      await create(8, 16, thirdId);
      await expect(bulk()).rejects.toMatchObject({
        error: {
          statusCode: 409,
          details: [
            {
              workforceUserId: personId,
              registrationNumber: 'SHIFT-A',
              firstName: 'Deniz',
              lastName: 'Kaya',
            },
            {
              workforceUserId: thirdId,
              registrationNumber: 'SHIFT-C',
              firstName: 'Ali',
              lastName: 'Yılmaz',
            },
          ],
        },
      });
      expect(await database!.dataSource.getRepository(Shift).count()).toBe(3);
      expect(
        await database!.dataSource
          .getRepository(Shift)
          .countBy({ workforceUserId: otherId }),
      ).toBe(0);
    });

    it('pasif üyenin çakışan eski vardiyası aktif üyelerin atamasını engellemez', async () => {
      await database!.dataSource
        .getRepository(Shift)
        .insert({
          workforceUserId: inactiveId,
          createdById: adminId,
          startAt: new Date(stamp(8)),
          endAt: new Date(stamp(16)),
        });
      const result = await bulk();
      expect(result).toHaveLength(3);
      expect(
        await database!.dataSource
          .getRepository(Shift)
          .countBy({ workforceUserId: inactiveId }),
      ).toBe(1);
    });

    it('uç uca başlayan toplu vardiya çakışma sayılmaz', async () => {
      await create(2, 8);
      expect(await bulk(8, 16)).toHaveLength(3);
      expect(await database!.dataSource.getRepository(Shift).count()).toBe(4);
    });

    it('pasif ekipte 409 verir ve hiç yazmaz', async () => {
      await database!.dataSource
        .getRepository(Team)
        .update(team.id, { isActive: false });
      await expect(bulk()).rejects.toMatchObject({
        error: { statusCode: 409 },
      });
      expect(await database!.dataSource.getRepository(Shift).count()).toBe(0);
    });

    it.each(['empty', 'inactive'] as const)(
      'aktif üye yoksa 409: %s',
      async (kind) => {
        await database!.dataSource
          .getRepository(WorkforceUser)
          .update(
            { teamId: team.id },
            kind === 'empty' ? { teamId: null } : { isActive: false },
          );
        await expect(bulk()).rejects.toMatchObject({
          error: { statusCode: 409, message: 'Ekibin aktif üyesi bulunmuyor' },
        });
        expect(await database!.dataSource.getRepository(Shift).count()).toBe(0);
      },
    );

    it('olmayan ekipte 404 verir', async () => {
      team.id = 999999;
      await expect(bulk()).rejects.toMatchObject({
        error: { statusCode: 404 },
      });
    });

    it('aynı ekibe paralel iki toplu istekte yalnızca tek tam atama kaydolur', async () => {
      const results = await Promise.allSettled([bulk(), bulk()]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const rejection = results.find((result) => result.status === 'rejected');
      expect(rejection).toMatchObject({
        reason: { error: { statusCode: 409, details: expect.any(Array) } },
      });
      expect(await database!.dataSource.getRepository(Shift).count()).toBe(3);
    });

    it('tekil atama ile yarışta toplu işlem ya tam yapılır ya da hiç yapılmaz', async () => {
      const results = await Promise.allSettled([
        bulk(),
        create(8, 16, personId),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const total = await database!.dataSource.getRepository(Shift).count();
      expect(total).toBe(results[0].status === 'fulfilled' ? 3 : 1);
      const otherCount = await database!.dataSource
        .getRepository(Shift)
        .countBy({ workforceUserId: otherId });
      expect(otherCount).toBe(results[0].status === 'fulfilled' ? 1 : 0);
    });

    it('kayıt aşamasında DB hatası olursa aktif üyelerin hiçbir kaydı kalmaz', async () => {
      // Teste özel trigger yalnızca son üyede hata üretir. Önceki satırlar da korunmaz.
      await database!.dataSource.query(
        `CREATE FUNCTION workforce.reject_test_shift() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.workforce_user_id = ${thirdId} THEN RAISE EXCEPTION 'test insert failure'; END IF; RETURN NEW; END; $$`,
      );
      try {
        await database!.dataSource.query(
          'CREATE TRIGGER reject_test_shift BEFORE INSERT ON workforce.shift FOR EACH ROW EXECUTE FUNCTION workforce.reject_test_shift()',
        );
        await expect(bulk()).rejects.toMatchObject({
          driverError: { code: 'P0001' },
        });
        expect(await database!.dataSource.getRepository(Shift).count()).toBe(0);
      } finally {
        await database!.dataSource.query(
          'DROP TRIGGER IF EXISTS reject_test_shift ON workforce.shift',
        );
        await database!.dataSource.query(
          'DROP FUNCTION workforce.reject_test_shift()',
        );
      }
    });
  });
});