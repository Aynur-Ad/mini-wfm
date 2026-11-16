import { describe, expect, it } from 'vitest';
import { checkWorkRules, checkRest, checkRestWithLoop } from './work-rules.js';
import type { RuleShift, WorkRulesOptions } from './work-rules.js';
const options: WorkRulesOptions = {
  timezoneOffsetMinutes: 180,
  minRestHours: 11,
  maxWeeklyHours: 60,
  maxConsecutiveDays: 6,
};
const shift = (
  day: number,
  start: number,
  end: number,
  person = 1,
): RuleShift => ({
  workforceUserId: person,
  startAt: new Date(Date.UTC(2035, 0, 1 + day, start - 3)),
  endAt: new Date(Date.UTC(2035, 0, 1 + day, end - 3)),
}); // 1 Ocak 2035 Pazartesi
const week = (count: number, start = 9, end = 13) =>
  Array.from({ length: count }, (_, day) => shift(day, start, end));
const cases = [
  {
    name: 'Pzt 08-16 ve 22-Sal06: 6 saat dinlenme',
    existing: [shift(0, 8, 16)],
    added: [shift(0, 22, 30)],
    expected: [['REST', 360]],
  },
  {
    name: 'Pzt 08-16 ve Sal03-11: tam 11 saat geçerli',
    existing: [shift(0, 8, 16)],
    added: [shift(1, 3, 11)],
    expected: [],
  },
  {
    name: 'Pzt-Cmt 07-18: 66 saat',
    existing: week(5, 7, 18),
    added: [shift(5, 7, 18)],
    expected: [['WEEKLY_LIMIT', 3960]],
  },
  {
    name: 'Pzt-Pzr09-13: 7 gün',
    existing: week(6),
    added: [shift(6, 9, 13)],
    expected: [['CONSECUTIVE_DAYS', 7]],
  },
  {
    name: 'Pzr22-Pzt06: 2+6 saat, ihlal yok',
    existing: [],
    added: [shift(6, 22, 30)],
    expected: [],
  },
];
describe('Çalışma kuralları saf hesabı', () => {
  it.each(cases)('$name', ({ existing, added, expected }) =>
    expect(
      checkWorkRules(existing, added, options).map((v) => [v.code, v.value]),
    ).toEqual(expected),
  );
  it('pazar gecesi vardiyasını önceki haftaya 2, yeni haftaya 6 saat yazar', () => {
    const result = checkWorkRules([], [shift(6, 22, 30)], {
      ...options,
      maxWeeklyHours: 1,
    });
    expect(
      result
        .filter((v) => v.code === 'WEEKLY_LIMIT')
        .map((v) => [v.weekStart, v.value]),
    ).toEqual([
      ['2035-01-01', 120],
      ['2035-01-08', 360],
    ]);
  });
  it('tam 60 saat ve 6 gün kabul edilir', () =>
    expect(checkWorkRules(week(5, 8, 18), [shift(5, 8, 18)], options)).toEqual(
      [],
    ));
  it('girdi dizileri, nesneleri ve Date değerleri değişmez; sırasız sonuç aynıdır', () => {
    const existing = week(6).map((s) => Object.freeze(s));
    const added = [Object.freeze(shift(6, 9, 13))];
    const before = JSON.stringify([existing, added]);
    Object.freeze(existing);
    Object.freeze(added);
    const result = checkWorkRules(existing, added, options);
    expect(checkWorkRules([...existing].reverse(), added, options)).toEqual(
      result,
    );
    expect(JSON.stringify([existing, added])).toBe(before);
  });
  it('aynı gün birden çok vardiya günü çoğaltmaz, gece yarısında bitiş ertesi güne sayılmaz', () => {
    const result = checkWorkRules([], [shift(0, 8, 10), shift(0, 23, 24)], {
      ...options,
      minRestHours: 1,
      maxConsecutiveDays: 1,
    });
    expect(result).toEqual([]);
  });
  it('gece yarısını aşan vardiya iki yerel günü çalışılmış sayar', () => {
    const result = checkWorkRules([], [shift(0, 23, 25)], {
      ...options,
      maxConsecutiveDays: 1,
    });
    expect(result).toMatchObject([
      {
        code: 'CONSECUTIVE_DAYS',
        value: 2,
        fromDate: '2035-01-01',
        toDate: '2035-01-02',
      },
    ]);
  });
  it('yerel gün hesabı işletim sistemi saatinden değil offsetten gelir', () => {
    const added = [shift(0, 23, 25)];
    expect(
      checkWorkRules([], added, {
        ...options,
        maxConsecutiveDays: 1,
        timezoneOffsetMinutes: 0,
      }),
    ).toEqual([]);
    expect(
      checkWorkRules([], added, { ...options, maxConsecutiveDays: 1 }),
    ).toHaveLength(1);
  });
  it('farklı personellerin vardiyaları birleşmez', () =>
    expect(
      checkWorkRules([shift(0, 8, 16)], [shift(0, 22, 30, 2)], options),
    ).toEqual([]));
  it('önceki ve sonraki vardiya yönünde REST ihlallerini birlikte bulur', () => {
    const result = checkWorkRules(
      [shift(0, 8, 12), shift(1, 8, 12)],
      [shift(0, 18, 24)],
      options,
    );
    expect(result.filter((v) => v.code === 'REST').map((v) => v.value)).toEqual(
      [360, 480],
    );
  });
  it('yeni vardiyaya dokunmayan eski ihlalleri yeniden raporlamaz', () =>
    expect(checkWorkRules(week(7), [shift(20, 9, 13)], options)).toEqual([]));
  it('boş yeni liste ve boş bütün liste ihlal üretmez', () => {
    expect(checkWorkRules(week(7), [], options)).toEqual([]);
    expect(checkWorkRules([], [], options)).toEqual([]);
  });
  it('1 saniye eksik dinlenmeyi tam 11 saate yuvarlamaz', () => {
    const added = shift(1, 3, 11);
    added.startAt = new Date(added.startAt.getTime() - 1000);
    expect(
      checkWorkRules([shift(0, 8, 16)], [added], options)[0],
    ).toMatchObject({ code: 'REST', value: 660 - 1 / 60 });
  });
  it.each(cases)('for ve dizi sürümü aynı: $name', ({ existing, added }) =>
    expect(checkRestWithLoop(existing, added, options)).toEqual(
      checkRest(existing, added, options),
    ),
  );
  it('seçenekler fonksiyona dışarıdan gelir', () =>
    expect(
      checkWorkRules([shift(0, 8, 16)], [shift(0, 22, 30)], {
        ...options,
        minRestHours: 6,
      }),
    ).toEqual([]));
  it('ara güne ekleme mevcut iki seriyi birleştirince 7 günü bulur', () => {
    const existing = week(7).filter((_, index) => index !== 3);
    expect(checkWorkRules(existing, [shift(3, 9, 13)], options)).toMatchObject([
      { code: 'CONSECUTIVE_DAYS', value: 7 },
    ]);
  });
  it('çalışılmayan gün seriyi keser', () =>
    expect(checkWorkRules(week(6), [shift(7, 9, 13)], options)).toEqual([]));
  it('geçersiz aralık ve seçenek sonsuz döngüye girmez', () => {
    expect(() =>
      checkWorkRules(
        [],
        [{ workforceUserId: 1, startAt: new Date('bad'), endAt: new Date() }],
        options,
      ),
    ).toThrow(RangeError);
    expect(() =>
      checkWorkRules([], [], { ...options, maxConsecutiveDays: 0 }),
    ).toThrow(RangeError);
  });
});