import { calculateTimesheetReference as slow } from '../../test/timesheet.reference.js';
import { describe, expect, it } from 'vitest';
import {
  calculateTimesheet as fast,
  timesheetHours,
} from './timesheet.js';
const options = { timezoneOffsetMinutes: 180 };
const shift = (start: string, end: string) => ({
  startAt: new Date(start + '+03:00'),
  endAt: new Date(end + '+03:00'),
});
const examples = [
  shift('2026-10-28T08:00:00', '2026-10-28T16:00:00'),
  shift('2026-10-30T18:00:00', '2026-10-31T02:00:00'),
  shift('2026-10-31T22:00:00', '2026-11-01T06:00:00'),
];
describe('Aylık puantaj saf hesabı', () => {
  it.each([fast, slow])('elle hesaplanan Ekim tablosu: %s', (fn) => {
    const result = timesheetHours(fn(examples, '2026-10', options));
    expect(result.totals).toEqual({
      total: 18,
      night: 8,
      weekend: 4,
      holiday: 3,
      overtime: 0,
    });
    expect(result.days.find((d) => d.date === '2026-10-28')).toMatchObject({
      total: 8,
      holiday: 3,
    });
    expect(result.days.find((d) => d.date === '2026-10-30')).toMatchObject({
      total: 6,
      night: 4,
    });
    expect(result.days).toHaveLength(31);
  });
  it('2-7 Kasım 48 saat, cumartesi son 3 saat fazla mesai', () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      shift(`2026-11-0${i + 2}T08:00:00`, `2026-11-0${i + 2}T16:00:00`),
    );
    const result = timesheetHours(fast(rows, '2026-11', options));
    expect(result.totals).toMatchObject({ total: 48, overtime: 3 });
    expect(result.days.find((d) => d.date === '2026-11-07')?.overtime).toBe(3);
  });
  it('ayın önceki kısmı haftalık fazla mesai hesabına katılır', () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      shift(
        `2026-09-${String(28 + i).padStart(2, '0')}T08:00:00`,
        `2026-09-${String(28 + i).padStart(2, '0')}T16:00:00`,
      ),
    ); // aşağıda geçerli tarihlerle hafta kurulur
    const start = Date.parse('2026-09-28T08:00:00+03:00');
    const valid = rows.map((_, i) => ({
      startAt: new Date(start + i * 86400000),
      endAt: new Date(start + i * 86400000 + 8 * 3600000),
    }));
    const result = timesheetHours(fast(valid, '2026-10', options));
    expect(result.totals).toMatchObject({ total: 24, overtime: 3 });
    expect(result.weeks[0]).toMatchObject({
      total: 48,
      monthTotal: 24,
      monthOvertime: 3,
    });
  });
  it('tatil hafta sonuna önceliklidir; 2027 çakışan bayram iki sayılmaz', () => {
    expect(
      timesheetHours(
        fast(
          [shift('2026-03-21T08:00:00', '2026-03-21T16:00:00')],
          '2026-03',
          options,
        ),
      ).totals,
    ).toMatchObject({ holiday: 8, weekend: 0 });
    expect(
      timesheetHours(
        fast(
          [shift('2027-05-19T08:00:00', '2027-05-19T16:00:00')],
          '2027-05',
          options,
        ),
      ).totals.holiday,
    ).toBe(8);
  });
  it('sırasız ve dondurulmuş girdi değişmez; boş ay sıfır günleri içerir', () => {
    const rows = Object.freeze(examples.map((s) => Object.freeze(s)));
    const before = JSON.stringify(rows);
    expect(fast([...rows].reverse(), '2026-10', options)).toEqual(
      fast(rows, '2026-10', options),
    );
    expect(JSON.stringify(rows)).toBe(before);
    expect(fast([], '2027-02', options).days).toHaveLength(28);
  });
  it('200 seedli ayda iki algoritma birebir aynı', () => {
    let seed = 360036;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let sample = 0; sample < 200; sample++) {
      const year = (sample % 2) + 2026,
        month = sample % 12;
      const anchor = Date.UTC(year, month, 1) - 7 * 86400000;
      const rows = Array.from({ length: 43 }, (_, i) => {
        const start =
          anchor + i * 86400000 + Math.floor(random() * 20) * 3600000;
        return {
          startAt: new Date(start),
          endAt: new Date(start + (1 + Math.floor(random() * 4)) * 3600000),
        };
      });
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      expect(fast(rows, key, options)).toEqual(slow(rows, key, options));
    }
  }, 20000);
  it('saniye hassasiyeti kaybolmaz, yalnız yanıt yuvarlanır', () => {
    const rows = [shift('2026-11-02T19:59:30', '2026-11-02T20:00:30')];
    expect(fast(rows, '2026-11', options).totals).toMatchObject({
      total: 1,
      night: 0.5,
    });
    expect(fast(rows, '2026-11', options).totals.night).toBeCloseTo(
      slow(rows, '2026-11', options).totals.night,
    );
  });
  it('desteklenmeyen yıl, geçersiz ay ve çakışma reddedilir', () => {
    expect(() => fast([], '2028-01', options)).toThrow();
    expect(() => fast([], '2026-13', options)).toThrow();
    expect(() =>
      fast([examples[0], examples[0]], '2026-10', options),
    ).toThrow();
  });
});