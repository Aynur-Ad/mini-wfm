import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Account } from '../accounts/entities/account.entity.js';
import { ReportsService } from '../reports/reports.service.js';
import { Shift } from '../shifts/entities/shift.entity.js';
import { Team } from '../teams/entities/team.entity.js';
import { WorkOrder } from '../work-orders/entities/work-order.entity.js';
import { WorkOrderStatus } from '../work-orders/work-order.enums.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';

describe('Ekip özet raporu — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase;
  const range = { from: '2026-11-18T00:00:00Z', to: '2026-11-19T00:00:00Z' };

  beforeAll(async () => {
    database = await startPostgresTestDatabase();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });

  it('durumları, aktif üyeleri ve aralığa düşen vardiya saatlerini tek sorguda toplar', async () => {
    const ds = database.dataSource;
    const service = new ReportsService(ds);
    const [team, emptyTeam] = await ds
      .getRepository(Team)
      .save([{ name: 'Bakım' }, { name: 'Yedek', isActive: false }]);
    const admin = await ds.getRepository(Account).findOneByOrFail({
      username: database.initialAdmin.username,
    });
    const [member, secondMember, inactiveMember, unassigned] = await ds
      .getRepository(WorkforceUser)
      .save(
        [team.id, team.id, team.id, null].map((teamId, index) => ({
          teamId,
          firstName: 'Test',
          lastName: 'Personel',
          registrationNumber: `REPORT-${index}`,
          isActive: index !== 2,
        })),
      );

    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-18T12:00:00Z'));
    const dueAt = new Date('2026-11-17T00:00:00Z');
    await ds.getRepository(WorkOrder).insert([
      ...Object.values(WorkOrderStatus).map((status, index) => ({
        title: status,
        code: `IE-2026-${String(index + 1).padStart(5, '0')}`,
        status,
        dueAt,
        teamId: team.id,
        createdById: admin.id,
      })),
      {
        title: 'Tam sınırda',
        code: 'IE-2026-00006',
        status: WorkOrderStatus.ASSIGNED,
        dueAt: new Date(Date.now()),
        teamId: team.id,
        createdById: admin.id,
      },
    ]);

    const shift = (person: WorkforceUser, start: string, end: string) => ({
      workforceUserId: person.id,
      startAt: new Date(start),
      endAt: new Date(end),
      createdById: admin.id,
    });
    await ds
      .getRepository(Shift)
      .insert([
        shift(member, '2026-11-17T22:00:00Z', '2026-11-18T02:30:00Z'),
        shift(secondMember, '2026-11-18T10:00:00Z', '2026-11-18T14:00:00Z'),
        shift(inactiveMember, '2026-11-18T22:00:00Z', '2026-11-19T02:00:00Z'),
        shift(member, '2026-11-17T20:00:00Z', range.from),
        shift(member, range.to, '2026-11-19T02:00:00Z'),
        shift(unassigned, '2026-11-18T11:00:00Z', '2026-11-18T15:00:00Z'),
      ]);
    const logQuery = vi.spyOn(ds.logger, 'logQuery');

    expect(await service.teamSummary(range)).toEqual([
      {
        teamId: team.id,
        teamName: 'Bakım',
        activeMemberCount: 2,
        workOrderCounts: {
          OPEN: 1,
          ASSIGNED: 2,
          IN_PROGRESS: 1,
          COMPLETED: 1,
          CANCELLED: 1,
        },
        overdueWorkOrderCount: 3,
        totalShiftHours: 8.5,
      },
      {
        teamId: emptyTeam.id,
        teamName: 'Yedek',
        activeMemberCount: 0,
        workOrderCounts: {
          OPEN: 0,
          ASSIGNED: 0,
          IN_PROGRESS: 0,
          COMPLETED: 0,
          CANCELLED: 0,
        },
        overdueWorkOrderCount: 0,
        totalShiftHours: 0,
      },
    ]);
    expect(logQuery).toHaveBeenCalledTimes(1);
  });
});
