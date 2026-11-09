/// <reference types="vite/client" />
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import type { MigrationInterface } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';

// Vite migration'ları TypeScript olarak yükler; data-source.ts/.env import edilmez.
// Yeni migration dosyaları da aynı glob ile otomatik bulunur.
const migrationModules = import.meta.glob<Record<string, new () => MigrationInterface>>(
  '../migrations/*.ts',
  { eager: true },
);

export interface PostgresTestDatabase {
  dataSource: DataSource;
  clean: () => Promise<void>;
  stop: () => Promise<void>;
}

export async function startPostgresTestDatabase(): Promise<PostgresTestDatabase> {
  // Her test dosyası yeni container ve rastgele host portu kullanır; reuse yoktur.
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase(`mini_wfm_test_${randomUUID().replaceAll('-', '')}`)
    .withUsername('test_user')
    .withPassword(randomUUID())
    .withStartupTimeout(120_000)
    .start();

  const dataSource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    namingStrategy: new SnakeNamingStrategy(),
    entities: [Team, WorkforceUser],
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
    async clean() {
      // Migration geçmişi public şemasında kalır. İş tabloları her testten sonra temizlenir.
      const tables = await dataSource.query<{ tablename: string }[]>(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'workforce' ORDER BY tablename",
      );
      if (tables.length === 0) return;
      const names = tables.map(({ tablename }) =>
        `"workforce"."${tablename.replaceAll('"', '""')}"`,
      );
      await dataSource.query(`TRUNCATE TABLE ${names.join(', ')} RESTART IDENTITY CASCADE`);
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