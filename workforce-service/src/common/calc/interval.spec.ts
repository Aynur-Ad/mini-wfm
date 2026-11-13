import { describe, expect, it } from 'vitest';
import { intersectionMinutes } from './interval.js';
const interval = (a: number, b: number) => ({
  startAt: new Date(a * 60_000),
  endAt: new Date(b * 60_000),
});
describe('Aralık kesişimi', () => {
  it.each([
    [0, 60, 30, 90, 30],
    [0, 60, 60, 120, 0],
    [0, 60, 80, 120, 0],
    [0, 120, 30, 60, 30],
    [0, 60, 0, 60, 60],
    [0, 0, 0, 60, 0],
  ])('%i-%i ve %i-%i kesişimi %i dakika', (a, b, c, d, expected) =>
    expect(intersectionMinutes(interval(a, b), interval(c, d))).toBe(expected),
  );
  it('saniyeli sınırda süreyi aşağı yuvarlayıp kaybetmez', () =>
    expect(
      intersectionMinutes(
        { startAt: new Date(0), endAt: new Date(61_000) },
        interval(0, 2),
      ),
    ).toBe(61 / 60));
  it('geçersiz/ters aralıkta güvenli hata verir', () => {
    expect(() => intersectionMinutes(interval(2, 1), interval(0, 3))).toThrow(
      RangeError,
    );
    expect(() =>
      intersectionMinutes(
        { startAt: new Date('bad'), endAt: new Date() },
        interval(0, 2),
      ),
    ).toThrow(RangeError);
  });
});