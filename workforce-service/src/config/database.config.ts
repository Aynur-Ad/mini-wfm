import { createInitialAdminSeed } from './initial-admin.config.js';
import { DatabaseLogger } from '../common/logging/database-logger.js';
import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Environment } from './environment.js';

export async function createDatabaseOptions(
  config: ConfigService<Environment, true>,
): Promise<TypeOrmModuleOptions> {
  const sourceDir = fileURLToPath(new URL('../', import.meta.url));
  return {
    type: 'postgres',
    extra: {
      initialAdmin: await createInitialAdminSeed({
        INITIAL_ADMIN_USERNAME: config.get('INITIAL_ADMIN_USERNAME', {
          infer: true,
        }),
        INITIAL_ADMIN_PASSWORD: config.get('INITIAL_ADMIN_PASSWORD', {
          infer: true,
        }),
      }),
    },
    logger: new DatabaseLogger(),
    host: config.get('DB_HOST', { infer: true }),
    port: config.get('DB_PORT', { infer: true }),
    username: config.get('DB_USER', { infer: true }),
    password: config.get('DB_PASSWORD', { infer: true }),
    database: config.get('DB_NAME', { infer: true }),
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    migrationsRun: true,
    entities: [path.join(sourceDir, '**/*.entity{.ts,.js}')],
    migrations: [path.join(sourceDir, 'migrations/*{.ts,.js}')],
  };
}