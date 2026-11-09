import { Logger } from '@nestjs/common';
import type { Logger as TypeOrmLogger } from 'typeorm';

// TypeORM'un SQL parametrelerini kendi console çıktısına yazmasını engeller.
export class DatabaseLogger implements TypeOrmLogger {
  private readonly logger = new Logger(DatabaseLogger.name);

  logQuery(): void {
    // SQL ve parametreleri telefon/şifre içerebilir; kaydedilmez.
  }

  logQueryError(): void {
    this.logger.error('Database query failed');
  }

  logQuerySlow(time: number): void {
    this.logger.warn(`Database query slow: ${time} ms`);
  }

  logSchemaBuild(): void {
    this.logger.log('Database schema operation');
  }

  logMigration(): void {
    this.logger.log('Database migration operation');
  }

  log(level: 'log' | 'info' | 'warn'): void {
    if (level === 'warn') this.logger.warn('Database warning');
    else this.logger.log('Database operation');
  }
}