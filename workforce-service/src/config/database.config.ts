import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import type { Environment } from './environment.js';

export function createDatabaseOptions(
  config: ConfigService<Environment, true>,
): TypeOrmModuleOptions {
  const sourceDir = fileURLToPath(new URL('../', import.meta.url));
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
    entities: [path.join(sourceDir, '**/*.entity{.ts,.js}')],
    migrations: [path.join(sourceDir, 'migrations/*{.ts,.js}')],
  };
}