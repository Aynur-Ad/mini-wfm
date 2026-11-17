import { DatabaseLogger } from '../common/logging/database-logger.js';
import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Environment } from './environment.js';
export function createDatabaseOptions(
  config: ConfigService<Environment, true>,
): TypeOrmModuleOptions {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return {
    type: 'postgres',
    host: config.get('DB_HOST', { infer: true }),
    port: config.get('DB_PORT', { infer: true }),
    username: config.get('DB_USER', { infer: true }),
    password: config.get('DB_PASSWORD', { infer: true }),
    database: config.get('DB_NAME', { infer: true }),
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    migrationsRun: true,
    migrationsTableName: 'notification_migrations',
    logger: new DatabaseLogger(),
    entities: [path.join(dir, '../**/*.entity{.ts,.js}')],
    migrations: [path.join(dir, '../migrations/*{.ts,.js}')],
  };
}
