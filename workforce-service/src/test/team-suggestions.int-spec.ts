import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';
import { WorkOrder } from '../work-orders/entities/work-order.entity.js';
import {
  WorkOrderStatus,
  WorkOrderPriority,
} from '../work-orders/work-order.enums.js';
import { TeamSuggestionsService } from '../work-orders/team-suggestions.service.js';
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { Shift } from '../shifts/entities/shift.entity.js';
import { Account } from '../accounts/entities/account.entity.js';
describe('Ekip önerisi gerçek PostgreSQL', () => {
  let db: PostgresTestDatabase | undefined,
    service: TeamSuggestionsService,
    id: number;
  beforeAll(async () => {
    db = await startPostgresTestDatabase();
    service = new TeamSuggestionsService(
      db.dataSource.getRepository(WorkOrder),
    );
  });
  beforeEach(async () => {
    const ds = db!.dataSource;
    const actor = (
      await ds
        .getRepository(Account)
        .findOneByOrFail({ username: db!.initialAdmin.username })
    ).id;
    const teams = await ds
      .getRepository(Team)
      .save([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
    const members = await ds.getRepository(WorkforceUser).save([
      {
        firstName: 'A',
        lastName: 'Bir',
        registrationNumber: 'S-A1',
        teamId: teams[0].id,
      },
      {
        firstName: 'A',
        lastName: 'İki',
        registrationNumber: 'S-A2',
        teamId: teams[0].id,
      },
      {
        firstName: 'B',
        lastName: 'Bir',
        registrationNumber: 'S-B1',
        teamId: teams[1].id,
      },
      {
        firstName: 'B',
        lastName: 'İki',
        registrationNumber: 'S-B2',
        teamId: teams[1].id,
      },
      {
        firstName: 'B',
        lastName: 'Üç',
        registrationNumber: 'S-B3',
        teamId: teams[1].id,
      },
    ]);
    const start = new Date(Date.now() + 3600000),
      end = new Date(start.getTime() + 8 * 3600000),
      dueAt = new Date(start.getTime() + 86400000);
    await ds
      .getRepository(Shift)
      .insert(
        members.map((m) => ({
          workforceUserId: m.id,
          createdById: actor,
          startAt: start,
          endAt: end,
        })),
      );
    const target = await ds
      .getRepository(WorkOrder)
      .save({
        code: 'S-TARGET',
        title: 'Öner',
        dueAt,
        createdById: actor,
        status: WorkOrderStatus.OPEN,
      });
    id = target.id;
    await ds
      .getRepository(WorkOrder)
      .insert(
        Array.from({ length: 6 }, (_, i) => ({
          code: `S-${i}`,
          title: 'Yük',
          dueAt: i === 5 ? new Date(Date.now() - 3600000) : dueAt,
          createdById: actor,
          status: WorkOrderStatus.ASSIGNED,
          teamId: i < 2 ? teams[0].id : teams[1].id,
        })),
      );
  });
  afterEach(async () => {
    await db?.clean();
  });
  afterAll(async () => {
    await db?.stop();
  });
  it('tablo puanları ve ilk üç öneri dört SELECT ile gelir', async () => {
    const spy = vi.spyOn(db!.dataSource.logger, 'logQuery');
    try {
      const result = await service.suggest(id);
      expect(result.suggestions.map((t) => [t.name, t.score])).toEqual([
        ['A', 22],
        ['B', 18],
      ]);
      expect(result.excluded[0].name).toBe('C');
      expect(
        spy.mock.calls.filter(([sql]) => sql.startsWith('SELECT')),
      ).toHaveLength(4);
    } finally {
      spy.mockRestore();
    }
  });
  it('URGENT öncelikte B66 ve A54, OPEN değilse 409', async () => {
    await db!.dataSource
      .getRepository(WorkOrder)
      .update(id, { priority: WorkOrderPriority.URGENT });
    expect(
      (await service.suggest(id)).suggestions.map((t) => [t.name, t.score]),
    ).toEqual([
      ['B', 66],
      ['A', 54],
    ]);
    await db!.dataSource
      .getRepository(WorkOrder)
      .update(id, { status: WorkOrderStatus.COMPLETED });
    await expect(service.suggest(id)).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
  });
  it('olmayan iş emri 404 verir', async () => {
    await expect(service.suggest(999999)).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });
});
