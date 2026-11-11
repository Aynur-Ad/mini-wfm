import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { QueryShiftsDto } from './query-shifts.dto.js';

const valid = { from: '2027-01-01T00:00:00Z', to: '2027-01-02T00:00:00Z' };
const errors = (value: object) =>
  validate(plainToInstance(QueryShiftsDto, value));

describe('QueryShiftsDto', () => {
  it('from ve to zorunludur', async () => {
    expect(await errors({})).toHaveLength(2);
  });
  it.each([
    { from: valid.from },
    { to: valid.to },
    { ...valid, from: '2027-01-01' },
    { ...valid, to: '2027-01-02T00:00:00' },
    { ...valid, from: '2027-02-30T00:00:00Z' },
    { ...valid, from: 'invalid' },
    { ...valid, from: null },
    { ...valid, to: null },
    { ...valid, to: valid.from },
    { ...valid, to: '2026-12-31T00:00:00Z' },
    { ...valid, to: '2027-02-01T00:00:00.001Z' },
    { ...valid, to: '2027-02-10T00:00:00Z' },
  ])(
    'eksik/geçersiz/ters/31 günü aşan aralık reddedilir: %j',
    async (value) => {
      expect((await errors(value)).length).toBeGreaterThan(0);
    },
  );
  it('tam 31 gün kabul edilir', async () => {
    expect(await errors({ ...valid, to: '2027-02-01T00:00:00Z' })).toEqual([]);
  });
  it('aralık tarih metniyle değil UTC anıyla karşılaştırılır', async () => {
    expect(
      await errors({
        from: '2027-01-01T03:00:00+03:00',
        to: '2027-02-01T00:00:00Z',
      }),
    ).toEqual([]);
    expect(
      (
        await errors({
          from: '2027-01-01T03:00:00+03:00',
          to: '2027-01-01T00:00:00Z',
        })
      ).length,
    ).toBeGreaterThan(0);
  });
  it('iki filtre birlikte sayıya dönüştürülür', async () => {
    const dto = plainToInstance(QueryShiftsDto, {
      ...valid,
      workforceUserId: '7',
      teamId: '3',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.workforceUserId).toBe(7);
    expect(dto.teamId).toBe(3);
  });
  it.each(['workforceUserId', 'teamId'])(
    '%s pozitif tamsayı olmalıdır',
    async (field) => {
      for (const value of ['0', '-1', '1.5', 'abc', '', ['1', '2']])
        expect(
          (await errors({ ...valid, [field]: value })).length,
        ).toBeGreaterThan(0);
    },
  );
  it('pagination/actor gibi tanımsız query alanları whitelist ile kaldırılır', async () => {
    const dto = plainToInstance(QueryShiftsDto, {
      ...valid,
      page: '2',
      limit: '1',
      actor: 'admin',
    });
    expect(await validate(dto, { whitelist: true })).toEqual([]);
    expect(Object.keys(dto).sort()).toEqual([
      'from',
      'teamId',
      'to',
      'workforceUserId',
    ]);
  });
});