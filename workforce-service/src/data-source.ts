import { DatabaseLogger } from './common/logging/database-logger.js';
import { validateEnvironment } from './config/environment.js';
import { createInitialAdminSeed } from './config/initial-admin.config.js';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env dosyasını CLI çalışırken doğrudan workforce-service/.env yolundan okur.
// Komut workforce-service klasöründe çalıştırıldığı için process.cwd() doğrudan o klasörü gösterir.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const settings = validateEnvironment(process.env);
const initialAdmin = await createInitialAdminSeed(settings);

const currentDir = import.meta.dirname ?? process.cwd();

export const dbConfig: DataSourceOptions = {
  type: 'postgres',
  logger: new DatabaseLogger(),
  host: settings.DB_HOST,
  port: settings.DB_PORT,
  username: settings.DB_USER,
  password: settings.DB_PASSWORD,
  database: settings.DB_NAME,
  extra: { initialAdmin },

  // 2.madde: camelCase -> snake_case
  namingStrategy: new SnakeNamingStrategy(),

  // 3.madde
  synchronize: false,

  // 5.madde: Servis açılırken bekleyen migration'lar otomatik çalışır.
  migrationsRun: true,

  entities: [path.join(currentDir, '/**/*.entity{.ts,.js}')],
  migrations: [path.join(currentDir, '/migrations/*{.ts,.js}')],
};

const AppDataSource = new DataSource(dbConfig);
export default AppDataSource;