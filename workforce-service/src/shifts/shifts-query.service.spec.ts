import type { MockInstance } from 'vitest';
import { DataSource } from 'typeorm';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ShiftsService } from './shifts.service.js';
import { Shift } from './entities/shift.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { Account } from '../accounts/entities/account.entity.js';
import { Team } from '../teams/entities/team.entity.js';

// Gerçek QueryBuilder ve PostgreSQL SQL üreticisi; yalnızca sorgu yürütmesi taklit edilir.
class MetadataSource extends DataSource {
  prepare() {
    return this.buildMetadatas();
  }
}
const query = { from: '2027-01-01T00:00:00Z', to: '2027-01-02T00:00:00Z' };

describe('ShiftsService tarih aralığı sorgusu', () => {
  let repository: Repository<Shift>;
  let builder: SelectQueryBuilder<Shift>;
  let service: ShiftsService;
  let execute: MockInstance<() => Promise<Shift[]>>;
  beforeAll(async () => {
    const source = new MetadataSource({
      type: 'postgres',
      entities: [Shift, WorkforceUser, Account, Team],
      namingStrategy: new SnakeNamingStrategy(),
    });
    await source.prepare();
    repository = source.getRepository(Shift);
  });
  beforeEach(() => {
    builder = repository.createQueryBuilder('shift');
    vi.spyOn(repository, 'createQueryBuilder').mockReturnValue(builder);
    execute = vi.spyOn(builder, 'getMany').mockResolvedValue([]);
    service = new ShiftsService(repository);
  });
  afterEach(() => vi.restoreAllMocks());

  it('tek join sorgusu ve kesişme koşulu üretir; sayfalama/count sorgusu oluşturmaz', async () => {
    expect(await service.findAll(query)).toEqual([]);
    const sql = builder.getSql();
    expect(sql).toContain('INNER JOIN "workforce"."workforce_user" "person"');
    expect(sql).toContain('LEFT JOIN "workforce"."team" "team"');
    expect(sql).toContain('"shift"."start_at" < $1');
    expect(sql).toContain('"shift"."end_at" > $2');
    expect(sql).toContain('ORDER BY "shift_start_at" ASC, "shift_id" ASC');
    expect(sql).not.toMatch(/LIMIT|OFFSET|COUNT\(/);
    expect(execute).toHaveBeenCalledOnce();
  });
  it('iki filtreyi AND ve parametrelerle aynı sorguya ekler', async () => {
    await service.findAll({ ...query, workforceUserId: 7, teamId: 3 });
    expect(builder.getQuery()).toContain(
      '"shift"."workforce_user_id" = :workforceUserId',
    );
    expect(builder.getQuery()).toContain('"person"."team_id" = :teamId');
    expect(builder.getParameters()).toEqual({
      from: new Date(query.from),
      to: new Date(query.to),
      workforceUserId: 7,
      teamId: 3,
    });
  });
  it.each([{ workforceUserId: 7 }, { teamId: 3 }])(
    'filtreleri tek başına kabul eder: %j',
    async (filter) => {
      await service.findAll({ ...query, ...filter });
      expect(builder.getParameters()).toMatchObject(filter);
    },
  );
  it('gereksiz personel ve hesap alanlarını seçmez', async () => {
    await service.findAll(query);
    const sql = builder.getSql();
    expect(sql).toContain('"person"."first_name"');
    expect(sql).toContain('"team"."name"');
    expect(sql).not.toMatch(
      /password_hash|registration_number|"phone"|JOIN "workforce"\."account"/,
    );
    expect(sql).not.toContain('is_active'); // Pasif personelin geçmiş vardiyası kaybolmaz.
  });
  it('liste yanıtında yalnızca açıkça seçilmiş personel/ekip alanlarını döndürür', async () => {
    const person = Object.assign(new WorkforceUser(), {
      id: 7,
      firstName: 'Deniz',
      lastName: 'Kaya',
      phone: 'private-phone',
      registrationNumber: 'private-number',
      team: Object.assign(new Team(), {
        id: 3,
        name: 'Ekip',
        description: 'private-description',
      }),
    });
    const row = Object.assign(new Shift(), {
      id: 1,
      workforceUserId: 7,
      workforceUser: person,
      startAt: new Date(query.from),
      endAt: new Date(query.to),
      note: null,
      createdById: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    execute.mockResolvedValue([row]);
    const result = await service.findAll(query);
    expect(result[0].workforceUser).toEqual({
      id: 7,
      firstName: 'Deniz',
      lastName: 'Kaya',
      team: { id: 3, name: 'Ekip' },
    });
    expect(JSON.stringify(result)).not.toContain('private-');
  });

  it('31 günlük sınırı ve UTC offset eşdeğerliğini kabul eder', async () => {
    await service.findAll({
      from: '2027-01-01T03:00:00+03:00',
      to: '2027-02-01T00:00:00Z',
    });
    expect(builder.getParameters().from).toEqual(new Date(query.from));
  });
  it.each([
    { from: 'invalid', to: query.to },
    { from: query.from, to: query.from },
    { from: query.to, to: query.from },
    { from: query.from, to: '2027-02-01T00:00:00.001Z' },
  ])('geçersiz aralıkta SQL yürütmez: %j', async (value) => {
    await expect(service.findAll(value)).rejects.toMatchObject({
      error: { statusCode: 400 },
    });
    expect(execute).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, Number.NaN])(
    'geçersiz filtre ID ile sorgu yürütmez: %s',
    async (teamId) => {
      await expect(service.findAll({ ...query, teamId })).rejects.toMatchObject(
        { error: { statusCode: 400 } },
      );
      expect(execute).not.toHaveBeenCalled();
    },
  );
});