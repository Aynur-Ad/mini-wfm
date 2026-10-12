import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env dosyasını CLI çalışırken doğrudan workforce-service/.env yolundan okur.
// Komut workforce-service klasöründe çalıştırıldığı için process.cwd() doğrudan o klasörü gösterir.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const currentDir = import.meta.dirname ?? process.cwd();

export const dbConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username : process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

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


