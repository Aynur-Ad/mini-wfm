import { describe, expect, it } from 'vitest';
import { buildRotationPlan, buildRotationCore } from './rotation.js';
import { checkWorkRules } from './work-rules.js';
const options = {
  timezoneOffsetMinutes: 180,
  minRestHours: 11,
  maxWeeklyHours: 60,
  maxConsecutiveDays: 6,
};
const slots = [
  { name: 'Sabah', startTime: '08:00', endTime: '16:00', requiredCount: 1 },
  { name: 'Akşam', startTime: '16:00', endTime: '24:00', requiredCount: 1 },
  { name: 'Gece', startTime: '00:00', endTime: '08:00', requiredCount: 1 },
];
const request = { startDate: '2026-11-02', days: 7, slots };
const members = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    registrationNumber: `P${i + 1}`,
  }));
describe('Rotasyon saf algoritması', () => {
  it('4 üye 21 vardiya, 6/5/5/5 dağılımı ve 8 saat fark', () => {
    const result = buildRotationPlan(members(4), [], request, options);
    expect(result.assignments).toHaveLength(21);
    expect(result.unfilled).toEqual([]);
    expect(result.totals.map((t) => t.hours).sort((a, b) => a - b)).toEqual([
      40, 40, 40, 48,
    ]);
    expect(result.fairnessHours).toBe(8);
    expect(
      checkWorkRules(
        [],
        result.assignments.map((a) => ({
          ...a,
          startAt: new Date(a.startAt),
          endAt: new Date(a.endAt),
        })),
        options,
      ),
    ).toEqual([]);
  });
  it('3 üye 7. günün üç kalıbını boş bırakır', () => {
    const result = buildRotationPlan(members(3), [], request, options);
    expect(result.assignments).toHaveLength(18);
    expect(result.unfilled).toHaveLength(3);
    expect(
      result.unfilled.every(
        (x) =>
          x.date === '2026-11-08' && x.reasonCodes.includes('CONSECUTIVE_DAYS'),
      ),
    ).toBe(true);
  });
  it.each([4, 5])('sıralama kapatılırsa %i üyeyle 7. Gece boş kalır', (n) => {
    const result = buildRotationCore(members(n), [], request, options, false);
    expect(result.unfilled).toContainEqual(
      expect.objectContaining({ date: '2026-11-08', slot: 'Gece' }),
    );
  });
  it('gece bitiminden hemen sonra sabah seçilmez', () => {
    const old = [
      {
        workforceUserId: 1,
        startAt: new Date('2026-11-02T00:00:00+03:00'),
        endAt: new Date('2026-11-02T08:00:00+03:00'),
      },
    ];
    const result = buildRotationPlan(
      members(2),
      old,
      { ...request, days: 1, slots: [slots[0]] },
      options,
    );
    expect(result.assignments[0].workforceUserId).toBe(2);
  });
  it('aynı girdi, üye/kalıp sırası değişse bile aynı sonucu verir; girdi değişmez', () => {
    const m = members(4);
    const before = JSON.stringify([m, request]);
    expect(
      buildRotationPlan(
        [...m].reverse(),
        [],
        { ...request, slots: [...slots].reverse() },
        options,
      ),
    ).toEqual(buildRotationPlan(m, [], request, options));
    expect(JSON.stringify([m, request])).toBe(before);
  });
  it('boş üyede tüm ihtiyaç eksik, personel tekrarlanmaz', () => {
    expect(
      buildRotationPlan([], [], { ...request, days: 1 }, options).unfilled,
    ).toHaveLength(3);
    const plan = buildRotationPlan(
      members(2),
      [],
      { ...request, days: 1, slots: [{ ...slots[0], requiredCount: 3 }] },
      options,
    );
    expect(plan.assignments).toHaveLength(2);
    expect(plan.unfilled[0].missing).toBe(1);
  });
  it('1–6 üye ve 1–14 gün için üretilen 84 planın hiçbiri çalışma kurallarını ihlal etmez', () => {
    for (let count = 1; count <= 6; count++)
      for (let days = 1; days <= 14; days++) {
        const plan = buildRotationPlan(
          members(count),
          [],
          { ...request, days },
          options,
        );
        const assigned = plan.assignments.map((a) => ({
          ...a,
          startAt: new Date(a.startAt),
          endAt: new Date(a.endAt),
        }));
        expect(checkWorkRules([], assigned, options)).toEqual([]);
      }
  });
  it('bozuk tarih/süre ve yinelenen ad reddedilir', () => {
    expect(() =>
      buildRotationPlan(
        members(4),
        [],
        { ...request, startDate: '2026-02-30' },
        options,
      ),
    ).toThrow();
    expect(() =>
      buildRotationPlan(
        members(4),
        [],
        { ...request, slots: [slots[0], slots[0]] },
        options,
      ),
    ).toThrow();
  });
});