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
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { Account } from '../accounts/entities/account.entity.js';
import { DEFAULT_WORK_RULE_OPTIONS } from '../config/work-rules.config.js';
import { requestContext } from '../common/logging/request-context.js';
import { AccountRole } from '../accounts/account-role.js';
const request = {
  startDate: '2035-01-01',
  days: 7,
  slots: [
    { name: 'Sabah', startTime: '08:00', endTime: '16:00', requiredCount: 1 },
    { name: 'Akşam', startTime: '16:00', endTime: '24:00', requiredCount: 1 },
    { name: 'Gece', startTime: '00:00', endTime: '08:00', requiredCount: 1 },
  ],
};
describe('Rotasyon gerçek PostgreSQL', () => {
  let db: PostgresTestDatabase | undefined,
    service: ShiftPlanningService,
    teamId: number,
    actor: { id: number; username: string; role: AccountRole };
  beforeAll(async () => {
    db = await startPostgresTestDatabase();
    service = new ShiftPlanningService(
      db.dataSource.getRepository(Shift),
      DEFAULT_WORK_RULE_OPTIONS,
    );
  });
  beforeEach(async () => {
    teamId = (await db!.dataSource.getRepository(Team).save({ name: 'Plan' }))
      .id;
    await db!.dataSource
      .getRepository(WorkforceUser)
      .save(
        Array.from({ length: 4 }, (_, i) => ({
          firstName: 'Plan',
          lastName: String(i),
          registrationNumber: `P${i}`,
          teamId,
        })),
      );
    const a = await db!.dataSource
      .getRepository(Account)
      .findOneByOrFail({ username: db!.initialAdmin.username });
    actor = { id: a.id, username: a.username, role: AccountRole.ADMIN };
  });
  afterEach(async () => {
    await db?.clean();
  });
  afterAll(async () => {
    await db?.stop();
  });
  const apply = () =>
    requestContext.run({ correlationId: 'rotation-int', actor }, () =>
      service.rotation(teamId, { ...request, apply: true }),
    );
  it('iki önizleme aynıdır ve DB boş kalır', async () => {
    expect(await service.rotation(teamId, request)).toEqual(
      await service.rotation(teamId, request),
    );
    expect(await db!.dataSource.getRepository(Shift).count()).toBe(0);
  });
  it('uygulama 21 kayıt yazar, tekrar uygulama 409 verir', async () => {
    expect((await apply()).assignments).toHaveLength(21);
    await expect(apply()).rejects.toMatchObject({
      error: { statusCode: 409, message: 'Plan tamamlanamadı' },
    });
    expect(await db!.dataSource.getRepository(Shift).count()).toBe(21);
  });
  it('3 üyeli eksik plan hiçbir şey yazmaz', async () => {
    const member = await db!.dataSource
      .getRepository(WorkforceUser)
      .findOneByOrFail({ registrationNumber: 'P3' });
    await db!.dataSource
      .getRepository(WorkforceUser)
      .update(member.id, { isActive: false });
    await expect(apply()).rejects.toMatchObject({ error: { statusCode: 409 } });
    expect(await db!.dataSource.getRepository(Shift).count()).toBe(0);
  });
  it('save hatası bütün kayıtları geri alır', async () => {
    await db!.dataSource.query(
      "CREATE FUNCTION workforce.reject_rotation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.note = 'Sabah' THEN RAISE EXCEPTION 'rotation rollback'; END IF; RETURN NEW; END; $$",
    );
    try {
      await db!.dataSource.query(
        'CREATE TRIGGER reject_rotation BEFORE INSERT ON workforce.shift FOR EACH ROW EXECUTE FUNCTION workforce.reject_rotation()',
      );
      await expect(apply()).rejects.toMatchObject({
        driverError: { code: 'P0001' },
      });
      expect(await db!.dataSource.getRepository(Shift).count()).toBe(0);
    } finally {
      await db!.dataSource.query(
        'DROP TRIGGER IF EXISTS reject_rotation ON workforce.shift',
      );
      await db!.dataSource.query('DROP FUNCTION workforce.reject_rotation()');
    }
  });
});