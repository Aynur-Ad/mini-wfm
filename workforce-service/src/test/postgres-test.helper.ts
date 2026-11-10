/// <reference types="vite/client" />
import 'reflect-metadata';
import { Account } from '../accounts/entities/account.entity.js';
import { AccountRole } from '../accounts/account-role.js';
import { createInitialAdminSeed } from '../config/initial-admin.config.js';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import type { MigrationInterface } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';

// Vite migration'ları TypeScript olarak yükler; data-source.ts/.env import edilmez.
// Yeni migration dosyaları da aynı glob ile otomatik bulunur.
const migrationModules = import.meta.glob<
  Record<string, new () => MigrationInterface>
>('../migrations/*.ts', { eager: true });

export interface PostgresTestDatabase {
  dataSource: DataSource;
  initialAdmin: { username: string; password: string };
  clean: () => Promise<void>;
  stop: () => Promise<void>;
}

export async function startPostgresTestDatabase(): Promise<PostgresTestDatabase> {
  // Tamamen test için üretilir; gerçek .env/ilk yönetici şifresi kullanılmaz.
  const initialAdmin = { username: 'initial_admin', password: randomUUID() };
  const initialSeed = await createInitialAdminSeed({
    INITIAL_ADMIN_USERNAME: initialAdmin.username,
    INITIAL_ADMIN_PASSWORD: initialAdmin.password,
  });
  // Her test dosyası yeni container ve rastgele host portu kullanır; reuse yoktur.
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase(`mini_wfm_test_${randomUUID().replaceAll('-', '')}`)
    .withUsername('test_user')
    .withPassword(randomUUID())
    .withStartupTimeout(120_000)
    .start();

  const dataSource = new DataSource({
    type: 'postgres',
    extra: { initialAdmin: initialSeed },
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    namingStrategy: new SnakeNamingStrategy(),
    entities: [Team, WorkforceUser, Account],
    migrations: Object.values(migrationModules).flatMap(Object.values),
    migrationsRun: false,
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
  } catch (error) {
    // Hazırlık yarıda kalsa da açılmış bağlantı ve container temizlenir.
    try {
      if (dataSource.isInitialized) await dataSource.destroy();
    } finally {
      await container.stop();
    }
    throw error;
  }

  return {
    dataSource,
    initialAdmin,
    async clean() {
      // Migration geçmişi public şemasında kalır. İş tabloları her testten sonra temizlenir.
      const tables = await dataSource.query<{ tablename: string }[]>(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'workforce' ORDER BY tablename",
      );
      if (tables.length === 0) return;
      const names = tables.map(
        ({ tablename }) => `"workforce"."${tablename.replaceAll('"', '""')}"`,
      );
      await dataSource.query(
        `TRUNCATE TABLE ${names.join(', ')} RESTART IDENTITY CASCADE`,
      );
      // Seed yönetici her testte aynı başlangıç durumunda olur; diğer hesaplar temizlenir.
      // id verilmez: sequence de INSERT ile doğru ilerler.
      await dataSource.getRepository(Account).insert({
        username: initialSeed.username,
        passwordHash: initialSeed.passwordHash,
        role: AccountRole.ADMIN,
      });
    },
    async stop() {
      try {
        if (dataSource.isInitialized) await dataSource.destroy();
      } finally {
        await container.stop();
      }
    },
  };
}