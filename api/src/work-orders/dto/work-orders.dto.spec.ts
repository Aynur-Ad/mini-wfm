import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateWorkOrderDto } from './create-work-order.dto.js';
import { UpdateWorkOrderDto } from './update-work-order.dto.js';
import { WorkOrderPriority } from '../work-order.enums.js';
const valid = { title: 'Bakım', dueAt: '2099-01-02T08:00:00+03:00' };
const errors = (body: object, patch = false) =>
  validate(
    patch
      ? plainToInstance(UpdateWorkOrderDto, { version: 1, ...body })
      : plainToInstance(CreateWorkOrderDto, body),
  );
describe('İş emri DTO', () => {
  it('başlığı trim eder', async () => {
    const dto = plainToInstance(CreateWorkOrderDto, {
      ...valid,
      title: ' Bakım ',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.title).toBe('Bakım');
  });
  it.each(['', '   ', 'a'.repeat(201), null, 1])(
    'geçersiz başlık: %s',
    async (title) => {
      expect((await errors({ ...valid, title })).length).toBeGreaterThan(0);
    },
  );
  it.each(Object.values(WorkOrderPriority))(
    '%s önceliği kabul edilir',
    async (priority) => {
      expect(await errors({ ...valid, priority })).toEqual([]);
    },
  );
  it.each(['INVALID', '', null])('hatalı öncelik: %s', async (priority) => {
    expect((await errors({ ...valid, priority })).length).toBeGreaterThan(0);
  });
  it.each([
    '2099-01-02',
    '2099-01-02T08:00:00',
    '2099-02-30T08:00:00Z',
    'invalid',
    null,
  ])('hatalı son tarih: %s', async (dueAt) => {
    expect((await errors({ ...valid, dueAt })).length).toBeGreaterThan(0);
  });
  it('create zorunlu alanlarını arar', async () => {
    expect(await errors({})).toHaveLength(2);
  });
  it('açıklama null ile temizlenebilir; PATCH kısmi olabilir', async () => {
    expect(await errors({ description: null }, true)).toEqual([]);
    expect(await errors({ title: 'Yeni' }, true)).toEqual([]);
  });
  it.each(['title', 'priority', 'dueAt'])(
    'PATCH %s null kabul etmez',
    async (field) => {
      expect((await errors({ [field]: null }, true)).length).toBeGreaterThan(0);
    },
  );
  it.each([false, true])(
    'status/teamId/code/actor gibi alanlar whitelist ile silinir; patch=%s',
    async (patch) => {
      const body = {
        ...valid,
        status: 'COMPLETED',
        teamId: 9,
        code: 'forged',
        createdById: 99,
        actor: { id: 99 },
        version: 99,
      };
      const dto = patch
        ? plainToInstance(UpdateWorkOrderDto, body)
        : plainToInstance(CreateWorkOrderDto, body);
      expect(await validate(dto, { whitelist: true })).toEqual([]);
      expect(JSON.parse(JSON.stringify(dto))).toEqual(
        patch ? { ...valid, version: 99 } : valid,
      );
    },
  );
});