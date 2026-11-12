import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { QueryWorkOrdersDto } from './query-work-orders.dto.js';

describe('İş emri liste DTO', () => {
  it('varsayılan sayfalama ve sıralama geçerlidir', async () => {
    const dto = plainToInstance(QueryWorkOrdersDto, {});
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });
  it.each(['OPEN', ['OPEN', 'ASSIGNED']])(
    'tek/çoklu durumu diziye dönüştürür: %j',
    async (status) => {
      const dto = plainToInstance(QueryWorkOrdersDto, { status });
      expect(await validate(dto)).toEqual([]);
      expect(dto.status).toEqual(Array.isArray(status) ? status : [status]);
    },
  );
  it('false boolean olarak korunur, sayısal alanlar dönüştürülür', async () => {
    const dto = plainToInstance(QueryWorkOrdersDto, {
      overdue: 'false',
      page: '2',
      limit: '100',
      teamId: '8',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({
      overdue: false,
      page: 2,
      limit: 100,
      teamId: 8,
    });
  });
  it.each([
    { page: '0' },
    { page: '1.5' },
    { page: 'abc' },
    { limit: '0' },
    { limit: '101' },
    { limit: ['1', '2'] },
    { teamId: '0' },
    { teamId: 'abc' },
    { teamId: '2.5' },
    { status: '' },
    { status: [] },
    { status: ['OPEN', 'bogus'] },
    { status: 'OPEN,ASSIGNED' },
    { priority: 'urgent' },
    { priority: ['HIGH', 'LOW'] },
    { overdue: '1' },
    { overdue: '' },
    { overdue: ['true', 'false'] },
    { sortBy: 'name;DROP TABLE team' },
    { sortBy: 'constructor' },
    { sortOrder: 'DESC' },
    { sortOrder: 'desc;DELETE' },
    { search: ['a', 'b'] },
  ])('geçersiz query reddedilir: %j', async (input) => {
    expect(
      (await validate(plainToInstance(QueryWorkOrdersDto, input))).length,
    ).toBeGreaterThan(0);
  });
});