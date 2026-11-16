import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RotationPlanDto } from './rotation-plan.dto.js';
const valid = {
  startDate: '2026-11-23',
  days: 7,
  slots: [
    { name: 'Sabah', startTime: '08:00', endTime: '16:00', requiredCount: 1 },
  ],
};
describe('Rotasyon DTO', () => {
  it('varsayılan önizleme ve nested kalıp geçerlidir', async () => {
    const dto = plainToInstance(RotationPlanDto, valid);
    expect(await validate(dto)).toEqual([]);
    expect(dto.apply).toBe(false);
  });
  it.each([
    { days: 0 },
    { days: 15 },
    { days: '7' },
    { apply: 'false' },
    { startDate: '2026-02-30' },
    { slots: [] },
    { slots: [{ ...valid.slots[0], requiredCount: 0 }] },
    { slots: [{ ...valid.slots[0], startTime: '24:00' }] },
    { slots: [{ ...valid.slots[0], endTime: '25:00' }] },
  ])('geçersiz gövde %j reddedilir', async (bad) =>
    expect(
      (await validate(plainToInstance(RotationPlanDto, { ...valid, ...bad })))
        .length,
    ).toBeGreaterThan(0),
  );
});