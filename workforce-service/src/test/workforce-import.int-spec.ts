import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Repository } from 'typeorm';
import { AccountRole } from '../accounts/account-role.js';
import { requestContext } from '../common/logging/request-context.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { WorkforceUsersService } from '../workforce_users/workforce_users.service.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';

describe('Personel CSV içe aktarma — PostgreSQL', () => {
  let database: PostgresTestDatabase;
  let people: Repository<WorkforceUser>;
  let service: WorkforceUsersService;

  beforeAll(async () => {
    database = await startPostgresTestDatabase();
    people = database.dataSource.getRepository(WorkforceUser);
    service = new WorkforceUsersService(people);
  });

  afterEach(async () => {
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });

  const run = (numbers: string[], role = AccountRole.ADMIN) =>
    requestContext.run(
      { correlationId: 'csv-test', actor: { id: 1, username: 'tester', role } },
      () =>
        service.importCsv(
          numbers.map((registrationNumber, index) => ({
            row: index + 2,
            person: { firstName: 'Can', lastName: 'Kaya', registrationNumber },
          })),
        ),
    );

  it('tüm satırları ekler ve mevcut sicillerde kısmi kayıt bırakmaz', async () => {
    await expect(run(['001', '002'])).resolves.toEqual({ imported: 2 });
    await expect(
      people.findOneByOrFail({ registrationNumber: '001' }),
    ).resolves.toMatchObject({ isActive: true, phone: null, teamId: null });
    await expect(run(['003', '002'])).rejects.toMatchObject({
      error: {
        statusCode: 409,
        details: [{ row: 3, messages: [expect.any(String)] }],
      },
    });
    expect(await people.existsBy({ registrationNumber: '003' })).toBe(false);
    expect(await people.count()).toBe(2);
  });

  it('dosyada yinelenen sicilleri ve yönetici olmayan aktörü reddeder', async () => {
    await expect(run(['001', '001'])).rejects.toMatchObject({
      error: {
        statusCode: 409,
        details: [
          { row: 2, messages: [expect.any(String)] },
          { row: 3, messages: [expect.any(String)] },
        ],
      },
    });
    await expect(run(['001'], AccountRole.VIEWER)).rejects.toMatchObject({
      error: { statusCode: 403 },
    });
    expect(await people.count()).toBe(0);
  });
});
