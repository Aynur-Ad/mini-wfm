import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ChangeWorkOrderStatusDto } from './change-work-order-status.dto.js';
const errors = (body: object) =>
  validate(plainToInstance(ChangeWorkOrderStatusDto, { version: 1, ...body }));
describe('Durum DTO', () => {
  it.each([
    { status: 'ASSIGNED', teamId: 1 },
    { status: 'IN_PROGRESS' },
    { status: 'COMPLETED' },
    { status: 'OPEN', teamId: null },
    { status: 'CANCELLED', reason: 'neden' },
  ])('geçerli gövde: %j', async (body) => {
    expect(await errors(body)).toEqual([]);
  });
  it.each([
    {},
    { status: 'BAD' },
    { status: 'ASSIGNED' },
    { status: 'ASSIGNED', teamId: null },
    { status: 'ASSIGNED', teamId: '1' },
    { status: 'ASSIGNED', teamId: 0 },
    { status: 'CANCELLED' },
    { status: 'CANCELLED', reason: '   ' },
    { status: 'CANCELLED', reason: null },
    { status: 'CANCELLED', reason: 'a'.repeat(501) },
  ])('hatalı gövde: %j', async (body) => {
    expect((await errors(body)).length).toBeGreaterThan(0);
  });
  it('neden kırpılır; beklenen durum ve actor istemciden alınmaz', async () => {
    const dto = plainToInstance(ChangeWorkOrderStatusDto, {
      version: 1,
      status: 'CANCELLED',
      reason: ' neden ',
      expectedStatus: 'OPEN',
      actor: { id: 9 },
      changedById: 9,
    });
    expect(await validate(dto, { whitelist: true })).toEqual([]);
    expect(JSON.parse(JSON.stringify(dto))).toEqual({
      version: 1,
      status: 'CANCELLED',
      reason: 'neden',
    });
  });
});