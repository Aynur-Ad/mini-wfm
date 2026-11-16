import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';
import { ShiftPlanningService } from '../shifts/shift-planning.service.js';
import { Shift } from '../shifts/entities/shift.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { Account } from '../accounts/entities/account.entity.js';
import { DEFAULT_WORK_RULE_OPTIONS } from '../config/work-rules.config.js';
describe('Puantaj gerçek PostgreSQL', () => {
  let db: PostgresTestDatabase | undefined,
    service: ShiftPlanningService,
    id: number,
    actor: number;
  beforeAll(async () => {
    db = await startPostgresTestDatabase();
    service = new ShiftPlanningService(
      db.dataSource.getRepository(Shift),
      DEFAULT_WORK_RULE_OPTIONS,
    );
  });
  beforeEach(async () => {
    id = (
      await db!.dataSource
        .getRepository(WorkforceUser)
        .save({
          firstName: 'Puantaj',
          lastName: 'Test',
          registrationNumber: 'TIME-1',
        })
    ).id;
    actor = (
      await db!.dataSource
        .getRepository(Account)
        .findOneByOrFail({ username: db!.initialAdmin.username })
    ).id;
  });
  afterEach(async () => {
    await db?.clean();
  });
  afterAll(async () => {
    await db?.stop();
  });
  it('geçmiş ay örnekleri gerçek kayıtlardan hesaplanır', async () => {
    await db!.dataSource.getRepository(Shift).insert(
      [
        ['2026-10-28T08:00', '2026-10-28T16:00'],
        ['2026-10-30T18:00', '2026-10-31T02:00'],
        ['2026-10-31T22:00', '2026-11-01T06:00'],
      ].map(([a, b]) => ({
        workforceUserId: id,
        createdById: actor,
        startAt: new Date(a + ':00+03:00'),
        endAt: new Date(b + ':00+03:00'),
      })),
    );
    expect((await service.timesheet(id, '2026-10')).totals).toEqual({
      total: 18,
      night: 8,
      weekend: 4,
      holiday: 3,
      overtime: 0,
    });
  });
  it('boş ayda bütün günler sıfırdır, olmayan personel 404 verir', async () => {
    expect((await service.timesheet(id, '2027-02')).days).toHaveLength(28);
    await expect(service.timesheet(999999, '2027-02')).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });
  it('ay dışı haftanın ilk günleri fazla mesaiye dahildir', async () => {
    const start = Date.parse('2026-09-28T08:00:00+03:00');
    await db!.dataSource
      .getRepository(Shift)
      .insert(
        Array.from({ length: 6 }, (_, i) => ({
          workforceUserId: id,
          createdById: actor,
          startAt: new Date(start + i * 86400000),
          endAt: new Date(start + i * 86400000 + 8 * 3600000),
        })),
      );
    expect((await service.timesheet(id, '2026-10')).totals).toMatchObject({
      total: 24,
      overtime: 3,
    });
  });
});