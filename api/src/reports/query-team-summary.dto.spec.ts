import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { QueryTeamSummaryDto } from './query-team-summary.dto.js';

describe('Ekip raporu aralığı', () => {
  const from = '2026-11-01T00:00:00Z';

  it('tam 31 günlük ve saat dilimi içeren aralığı kabul eder', async () => {
    const query = plainToInstance(QueryTeamSummaryDto, {
      from,
      to: '2026-12-02T03:00:00+03:00',
    });
    expect(await validate(query)).toEqual([]);
  });

  it.each([
    undefined,
    from,
    '2026-10-31T00:00:00Z',
    '2026-11-31T00:00:00Z',
    '2026-11-02T00:00:00',
    '2026-12-02T00:00:00.001Z',
  ])('geçersiz bitişi reddeder: %s', async (to) => {
    const query = plainToInstance(QueryTeamSummaryDto, { from, to });
    expect(await validate(query)).not.toHaveLength(0);
  });
});
