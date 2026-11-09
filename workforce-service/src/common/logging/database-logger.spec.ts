import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Logger as TypeOrmLogger } from 'typeorm';
import { DatabaseLogger } from './database-logger.js';

afterEach(() => vi.restoreAllMocks());
describe('DatabaseLogger', () => {
  it('SQL, parametreler ve ham veritabanı hatalarını loglamaz', () => {
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const logger: TypeOrmLogger = new DatabaseLogger();
    logger.logQuery('SELECT secret_password', ['5321234567']);
    logger.logQueryError('password=hidden', 'SELECT secret_password', [
      '5321234567',
    ]);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('Database query failed');
    expect(JSON.stringify(error.mock.calls)).not.toMatch(
      /hidden|secret_password|5321234567/,
    );
  });
});