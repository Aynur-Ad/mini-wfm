import { DatabaseLogger } from './common/logging/database-logger.js';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { validateEnvironment } from './config/environment.js';
dotenv.config({ path: path.join(process.cwd(), '.env') });
const config = validateEnvironment(process.env);
const dir = import.meta.dirname ?? process.cwd();
export default new DataSource({
  type: 'postgres',
  host: config.DB_HOST,
  port: config.DB_PORT,
  username: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  migrationsRun: true,
  migrationsTableName: 'notification_migrations',
  logger: new DatabaseLogger(),
  entities: [path.join(dir, '**/*.entity{.ts,.js}')],
  migrations: [path.join(dir, 'migrations/*{.ts,.js}')],
});
