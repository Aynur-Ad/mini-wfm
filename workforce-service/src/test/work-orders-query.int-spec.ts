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
import { WorkOrdersService } from '../work-orders/work-orders.service.js';
import { WorkOrder } from '../work-orders/entities/work-order.entity.js';
import {
  WorkOrderPriority as Priority,
  WorkOrderStatus as Status,
} from '../work-orders/work-order.enums.js';
import type { QueryWorkOrdersDto } from '../work-orders/dto/query-work-orders.dto.js';
import { Team } from '../teams/entities/team.entity.js';
import { Account } from '../accounts/entities/account.entity.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';

describe('İş emri listesi — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined;
  let service: WorkOrdersService;
  let teamA: Team;
  let teamB: Team;
  const now = new Date('2035-06-01T12:00:00Z');
  const past = new Date(now.getTime() - 3_600_000);
  const future = new Date(now.getTime() + 3_600_000);
  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    service = new WorkOrdersService(
      database.dataSource.getRepository(WorkOrder),
    );
  });
  beforeEach(async () => {
    const ds = database!.dataSource;
    [teamA, teamB] = await ds
      .getRepository(Team)
      .save([{ name: 'Saha A' }, { name: 'Saha B' }]);
    const actor = await ds
      .getRepository(Account)
      .findOneByOrFail({ username: database!.initialAdmin.username });
    // Liste sorgusunu sınamak için kapanmış/geçmiş kayıtlar doğrudan fixture olarak kurulur.
    // Oluşturma endpoint'inin geçmiş dueAt yasağı değiştirilmez.
    const samples = [
      {
        title: 'Valve bakım',
        priority: Priority.LOW,
        status: Status.OPEN,
        teamId: teamA.id,
        dueAt: past,
      },
      {
        title: 'VALVE kontrol',
        priority: Priority.URGENT,
        status: Status.ASSIGNED,
        teamId: teamA.id,
        dueAt: past,
      },
      {
        title: 'Elektrik',
        priority: Priority.HIGH,
        status: Status.IN_PROGRESS,
        teamId: teamB.id,
        dueAt: future,
      },
      {
        title: 'Tamamlandı',
        priority: Priority.MEDIUM,
        status: Status.COMPLETED,
        teamId: teamA.id,
        dueAt: past,
      },
      {
        title: 'İptal',
        priority: Priority.URGENT,
        status: Status.CANCELLED,
        teamId: teamA.id,
        dueAt: past,
      },
      {
        title: 'valve ikinci',
        priority: Priority.HIGH,
        status: Status.OPEN,
        teamId: teamA.id,
        dueAt: past,
      },
      {
        title: 'Atanmamış',
        priority: Priority.LOW,
        status: Status.OPEN,
        teamId: null,
        dueAt: future,
      },
    ];
    for (const [index, sample] of samples.entries()) {
      await ds
        .getRepository(WorkOrder)
        .insert({
          ...sample,
          code: `IE-2035-${String(index + 1).padStart(5, '0')}`,
          createdById: actor.id,
          createdAt: new Date(now.getTime() + index * 1000),
        });
    }
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
  });
  afterEach(async () => {
    vi.useRealTimers();
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });
  const ids = (result: Awaited<ReturnType<WorkOrdersService['findAll']>>) =>
    result.data.map((row) => row.id);

  it('varsayılan sayfa ve createdAt desc; yanıt ekip özeti ve gecikme alanı içerir', async () => {
    const result = await service.findAll();
    expect(result).toMatchObject({ total: 7, page: 1, limit: 10 });
    expect(ids(result)).toEqual([7, 6, 5, 4, 3, 2, 1]);
    expect(result.data.find((row) => row.id === 1)?.team).toEqual({
      id: teamA.id,
      name: 'Saha A',
    });
    expect(result.data.find((row) => row.id === 7)?.team).toBeNull();
    expect(result.data.every((row) => typeof row.isOverdue === 'boolean')).toBe(
      true,
    );
    expect(result.data[0]).not.toHaveProperty('priority_rank');
    expect(result.data[0]).not.toHaveProperty('joinedTeamId');
  });
  it('başlık araması harf duyarsızdır ve total sayfadan bağımsızdır', async () => {
    const result = await service.findAll({
      search: '  vAlVe  ',
      page: 2,
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
    expect(result).toMatchObject({ total: 3, page: 2, limit: 1 });
    expect(ids(result)).toEqual([2]);
  });
  it('kodda harf duyarsız arama yapar', async () => {
    expect(ids(await service.findAll({ search: 'ie-2035-00003' }))).toEqual([
      3,
    ]);
  });
  it('çoklu durum OR, farklı filtreler AND ile birleşir', async () => {
    const result = await service.findAll({
      status: [Status.OPEN, Status.ASSIGNED],
      search: 'valve',
      priority: Priority.HIGH,
      teamId: teamA.id,
      overdue: true,
    });
    expect(result.total).toBe(1);
    expect(ids(result)).toEqual([6]);
  });
  it('arama OR ifadesi diğer filtreyi aşamaz', async () => {
    expect(
      (await service.findAll({ search: 'IE-2035', teamId: teamB.id })).total,
    ).toBe(1);
  });
  it('overdue=true geçmiş son tarihli açık/atanmış/devam eden işleri getirir', async () => {
    await database!.dataSource
      .getRepository(WorkOrder)
      .update(3, { dueAt: past });
    const result = await service.findAll({ overdue: true });
    expect(ids(result)).toEqual([6, 3, 2, 1]);
    expect(result.data.every((row) => row.isOverdue)).toBe(true);
  });
  it('COMPLETED ve CANCELLED kayıtları geçmiş son tarihte de gecikmiş değildir', async () => {
    const result = await service.findAll();
    expect(
      result.data.filter((row) => row.isOverdue).map((row) => row.id),
    ).toEqual([6, 2, 1]);
    for (const id of [3, 4, 5, 7])
      expect(result.data.find((row) => row.id === id)?.isOverdue).toBe(false);
  });
  it('dueAt tam referans anına eşitse gecikmiş sayılmaz', async () => {
    await database!.dataSource
      .getRepository(WorkOrder)
      .update(1, { dueAt: now });
    expect((await service.findOne(1)).dueAt).toEqual(now);
    expect(
      (await service.findAll()).data.find((row) => row.id === 1)?.isOverdue,
    ).toBe(false);
    expect(ids(await service.findAll({ overdue: true }))).not.toContain(1);
  });
  it('overdue=false ve gönderilmemesi ek filtre oluşturmaz', async () => {
    expect(ids(await service.findAll({ overdue: false }))).toEqual(
      ids(await service.findAll()),
    );
  });
  it.each([
    ['desc', [5, 2, 6, 3, 4, 7, 1]],
    ['asc', [1, 7, 4, 3, 6, 2, 5]],
  ] as const)(
    'öncelik %s alfabetik değil önem sırasındadır; eşitlikte ID belirleyicidir',
    async (sortOrder, expected) => {
      expect(
        ids(await service.findAll({ sortBy: 'priority', sortOrder })),
      ).toEqual(expected);
    },
  );
  it('dueAt asc sayfaları eşit tarihlerde tekrar/kayıp üretmez', async () => {
    const first = await service.findAll({
      sortBy: 'dueAt',
      sortOrder: 'asc',
      limit: 3,
    });
    const second = await service.findAll({
      sortBy: 'dueAt',
      sortOrder: 'asc',
      page: 2,
      limit: 3,
    });
    expect(ids(first)).toEqual([1, 2, 4]);
    expect(ids(second)).toEqual([5, 6, 3]);
    expect(first.total).toBe(7);
    expect(second.total).toBe(7);
  });
  it('son sayfa ötesinde data boşken total korunur; eşleşme yoksa total sıfırdır', async () => {
    expect(
      await service.findAll({ status: [Status.OPEN], page: 9, limit: 2 }),
    ).toEqual({ data: [], total: 3, page: 9, limit: 2 });
    expect(await service.findAll({ search: 'yoktur' })).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });
  it('arama jokerleri ve SQL benzeri metin literal parametre olarak ele alınır', async () => {
    await database!.dataSource
      .getRepository(WorkOrder)
      .update(1, { title: "Özel %_\\ ' OR 1=1 --" });
    expect(ids(await service.findAll({ search: '%_\\' }))).toEqual([1]);
    expect(ids(await service.findAll({ search: "' OR 1=1 --" }))).toEqual([1]);
  });
  it('boş arama listeyi daraltmaz', async () => {
    expect((await service.findAll({ search: '  ' })).total).toBe(7);
  });
  it('sıralama enjeksiyonu DB tablosunu etkilemeden 400 döner', async () => {
    await expect(
      service.findAll({
        sortBy: 'name;DROP TABLE team',
      } as unknown as QueryWorkOrdersDto),
    ).rejects.toMatchObject({ error: { statusCode: 400 } });
    expect(await database!.dataSource.getRepository(Team).count()).toBe(2);
  });
});