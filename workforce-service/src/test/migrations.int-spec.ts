import { Account } from '../accounts/entities/account.entity.js';
import { AccountRole } from '../accounts/account-role.js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { startPostgresTestDatabase } from './postgres-test.helper.js';
import type { PostgresTestDatabase } from './postgres-test.helper.js';

describe('Migration yaşam döngüsü — gerçek PostgreSQL', () => {
  let database: PostgresTestDatabase | undefined;

  beforeAll(async () => {
    database = await startPostgresTestDatabase();
  });
  afterEach(async () => {
    await database?.clean();
  });
  afterAll(async () => {
    await database?.stop();
  });

  it('tüm migration dosyalarını uygular, ters sırada geri alır ve tekrar uygular', async () => {
    if (!database) throw new Error('Test veritabanı hazırlanmadı');
    const { dataSource } = database;
    const count = dataSource.migrations.length;
    expect(count).toBeGreaterThan(0);
    const applied = await dataSource.query<{ count: number }[]>(
      'SELECT COUNT(*)::int AS count FROM "migrations"',
    );
    expect(applied[0].count).toBe(count);
    expect(await dataSource.showMigrations()).toBe(false);

    // Migration sınıflarının down metotlarını doğrudan değil, gerçek TypeORM geçmişini kullanır.
    for (let index = 0; index < count; index++)
      await dataSource.undoLastMigration();
    const reverted = await dataSource.query<{ count: number }[]>(
      'SELECT COUNT(*)::int AS count FROM "migrations"',
    );
    expect(reverted[0].count).toBe(0);
    const schemas = await dataSource.query<{ schema_name: string }[]>(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'workforce'",
    );
    expect(schemas).toEqual([]);
    expect(await dataSource.showMigrations()).toBe(true);

    const rerun = await dataSource.runMigrations();
    expect(rerun).toHaveLength(count);
    const admin = await dataSource
      .getRepository(Account)
      .findOneByOrFail({ username: database.initialAdmin.username });
    expect(admin.role).toBe(AccountRole.ADMIN);
    expect(admin.passwordHash).toBeUndefined();
    expect(await dataSource.showMigrations()).toBe(false);
    const runner = dataSource.createQueryRunner();
    try {
      const teamTable = await runner.getTable('workforce.team');
      const peopleTable = await runner.getTable('workforce.workforce_user');
      expect(
        teamTable?.uniques.some((unique) =>
          unique.columnNames.includes('name'),
        ),
      ).toBe(true);
      expect(
        peopleTable?.foreignKeys.some(
          (key) => key.name === 'FK_workforce_user_team',
        ),
      ).toBe(true);
    } finally {
      await runner.release();
    }

    // Şema tekrar kurulduktan sonra entity'lerle gerçek kayıt ve ilişki oluşturulabilir.
    const team = await dataSource
      .getRepository(Team)
      .save({ name: 'Yeniden Kurulan Ekip' });
    const person = await dataSource.getRepository(WorkforceUser).save({
      firstName: 'Deniz',
      lastName: 'Kaya',
      registrationNumber: 'P1001',
      teamId: team.id,
    });
    expect(person.teamId).toBe(team.id);
  });
});