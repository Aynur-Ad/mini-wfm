import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateWorkOrderDto } from './update-work-order.dto.js';
import { ChangeWorkOrderStatusDto } from './change-work-order-status.dto.js';

describe('İş emri zorunlu version sözleşmesi', () => {
  it.each([undefined, null, 0, -1, 1.5, '1', true, {}, []])(
    'iki DTO da geçersiz versionı reddeder: %j',
    async (version) => {
      for (const dto of [
        plainToInstance(UpdateWorkOrderDto, { version }),
        plainToInstance(ChangeWorkOrderStatusDto, { version, status: 'OPEN' }),
      ]) {
        expect(
          (await validate(dto)).some((error) => error.property === 'version'),
        ).toBe(true);
      }
    },
  );
  it('pozitif tam sayıyı korur; create DTOsuna version eklenmez', async () => {
    const dto = plainToInstance(UpdateWorkOrderDto, {
      version: 3,
      title: 'Yeni',
    });
    expect(await validate(dto, { whitelist: true })).toEqual([]);
    expect(dto.version).toBe(3);
  });
});