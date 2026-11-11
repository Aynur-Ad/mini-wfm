import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateShiftDto } from './create-shift.dto.js';
import { UpdateShiftDto } from './update-shift.dto.js';

const dto = {
  workforceUserId: 1,
  startAt: '2099-01-02T08:00:00+03:00',
  endAt: '2099-01-02T16:00:00+03:00',
};
const errors = async (value: object, patch = false) =>
  validate(plainToInstance(patch ? UpdateShiftDto : CreateShiftDto, value));

describe('Vardiya DTO doğrulaması', () => {
  it.each(['2099-01-02T05:00:00Z', '2099-01-02T08:00:00+03:00'])(
    'saat dilimi belirtilmiş ISO kabul edilir: %s',
    async (startAt) => {
      expect(await errors({ ...dto, startAt })).toEqual([]);
    },
  );
  it.each([
    '2099-01-02',
    '2099-01-02T08:00:00',
    '2099-02-30T08:00:00Z',
    'yanlış',
    '',
    null,
    123,
  ])('geçersiz veya saat dilimsiz başlangıcı reddeder: %s', async (startAt) => {
    expect((await errors({ ...dto, startAt })).length).toBeGreaterThan(0);
  });
  it.each(['2099-01-02', '2099-01-02T16:00:00', null])(
    'geçersiz bitişi reddeder: %s',
    async (endAt) => {
      expect((await errors({ ...dto, endAt })).length).toBeGreaterThan(0);
    },
  );
  it.each([0, -1, 1.5, '1', null])(
    'geçersiz personel ID reddedilir: %s',
    async (workforceUserId) => {
      expect(
        (await errors({ ...dto, workforceUserId })).length,
      ).toBeGreaterThan(0);
    },
  );
  it('create için zorunlu alanları arar', async () => {
    expect(await errors({})).toHaveLength(3);
  });
  it.each([undefined, null, '', 'a'.repeat(500)])(
    'note opsiyonel/temizlenebilir/en fazla 500 karakterdir',
    async (note) => {
      expect(await errors({ ...dto, note })).toEqual([]);
    },
  );
  it.each([123, 'a'.repeat(501)])('geçersiz note reddedilir', async (note) => {
    expect((await errors({ ...dto, note })).length).toBeGreaterThan(0);
  });
  it('PATCH gönderilmeyen alanları zorunlu tutmaz', async () => {
    expect(await errors({ note: null }, true)).toEqual([]);
    expect(await errors({ startAt: dto.startAt }, true)).toEqual([]);
  });
  it.each(['workforceUserId', 'startAt', 'endAt'])(
    'PATCH %s null kabul etmez',
    async (field) => {
      expect((await errors({ [field]: null }, true)).length).toBeGreaterThan(0);
    },
  );
  it('whitelist ile createdById ve actor kaldırılır', async () => {
    const value = plainToInstance(CreateShiftDto, {
      ...dto,
      createdById: 999,
      actor: { id: 999 },
    });
    expect(await validate(value, { whitelist: true })).toEqual([]);
    expect(value).not.toHaveProperty('createdById');
    expect(value).not.toHaveProperty('actor');
  });
});