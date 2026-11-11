import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateTeamShiftsDto } from './create-team-shifts.dto.js';

const valid = {
  startAt: '2099-01-02T08:00:00+03:00',
  endAt: '2099-01-02T16:00:00+03:00',
};
const errors = (body: object) =>
  validate(plainToInstance(CreateTeamShiftsDto, body));

describe('CreateTeamShiftsDto', () => {
  it('personel ID istemez; tarih kuralları tekil vardiyadan devralınır', async () => {
    expect(await errors(valid)).toEqual([]);
  });
  it.each([
    {},
    { startAt: valid.startAt },
    { endAt: valid.endAt },
    { ...valid, startAt: '2099-01-02T08:00:00' },
    { ...valid, endAt: null },
    { ...valid, startAt: '2099-02-30T08:00:00Z' },
    { ...valid, note: 'a'.repeat(501) },
  ])('geçersiz veri reddedilir: %j', async (body) => {
    expect((await errors(body)).length).toBeGreaterThan(0);
  });
  it.each([null, '', 'a'.repeat(500)])(
    'not temizlenebilir veya en fazla 500 karakter olabilir',
    async (note) => {
      expect(await errors({ ...valid, note })).toEqual([]);
    },
  );
  it('üye listesi, personel, ekip ve actor bodyden kabul edilmez', async () => {
    const dto = plainToInstance(CreateTeamShiftsDto, {
      ...valid,
      teamId: 999,
      workforceUserId: 999,
      memberIds: [999],
      createdById: 999,
      actor: { id: 999 },
    });
    expect(await validate(dto, { whitelist: true })).toEqual([]);
    expect(JSON.parse(JSON.stringify(dto))).toEqual(valid);
  });
});