import {
  DAY,
  MINUTE,
  dateKey,
  localMidnight,
  weekStart,
} from '../../common/calc/local-time.js';
import { HOLIDAYS } from './holidays.js';
import type { Interval } from '../../common/calc/interval.js';
export interface TimesheetOptions {
  timezoneOffsetMinutes: number;
  overtimeAfterMinutes?: number;
}
export interface Minutes {
  total: number;
  night: number;
  holiday: number;
  weekend: number;
  overtime: number;
}
export interface Timesheet {
  month: string;
  days: (Minutes & { date: string })[];
  weeks: {
    weekStart: string;
    total: number;
    overtime: number;
    monthTotal: number;
    monthOvertime: number;
  }[];
  totals: Minutes;
}
const empty = (): Minutes => ({
  total: 0,
  night: 0,
  holiday: 0,
  weekend: 0,
  overtime: 0,
});
export function monthRange(month: string, offset: number) {
  if (!/^202[67]-(0[1-9]|1[0-2])$/.test(month))
    throw new RangeError('Ay 2026 veya 2027 için YYYY-MM biçiminde olmalıdır');
  const start = localMidnight(`${month}-01`, offset);
  const d = new Date(start + offset * MINUTE);
  const end =
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - offset * MINUTE;
  return {
    start,
    end,
    from: weekStart(start, offset),
    to: weekStart(end - 1, offset) + 7 * DAY,
  };
}
export function prepareTimesheet(
  shifts: readonly Interval[],
  month: string,
  options: TimesheetOptions,
) {
  const offset = options.timezoneOffsetMinutes,
    range = monthRange(month, offset),
    threshold = options.overtimeAfterMinutes ?? 2700;
  if (
    !Number.isInteger(offset) ||
    Math.abs(offset) > 840 ||
    !Number.isFinite(threshold) ||
    threshold < 0
  )
    throw new RangeError('Geçersiz puantaj seçenekleri');
  const sorted = shifts
    .map((s) => ({
      start: Math.max(s.startAt.getTime(), range.from),
      end: Math.min(s.endAt.getTime(), range.to),
    }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  if (
    shifts.some(
      (s) =>
        !Number.isFinite(s.startAt.getTime()) ||
        !Number.isFinite(s.endAt.getTime()) ||
        s.endAt <= s.startAt,
    )
  )
    throw new RangeError('Geçersiz vardiya');
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].start < sorted[i - 1].end)
      throw new RangeError('Puantajda çakışan vardiya olamaz');
  const days = new Map<string, Minutes>();
  for (let t = range.start; t < range.end; t += DAY)
    days.set(dateKey(t, offset), empty());
  const weeks = new Map<
    number,
    {
      total: number;
      overtime: number;
      monthTotal: number;
      monthOvertime: number;
    }
  >();
  for (let t = range.from; t < range.to; t += 7 * DAY)
    weeks.set(t, { total: 0, overtime: 0, monthTotal: 0, monthOvertime: 0 });
  return { offset, range, threshold, sorted, days, weeks };
}
const holidays = new Map(HOLIDAYS.map((h) => [h.date, h]));
export function finishTimesheet(
  state: ReturnType<typeof prepareTimesheet>,
  month: string,
): Timesheet {
  const days = [...state.days].map(([date, minutes]) => ({ date, ...minutes }));
  const totals = days.reduce((sum, row) => {
    for (const key of Object.keys(sum) as (keyof Minutes)[])
      sum[key] += row[key];
    return sum;
  }, empty());
  return {
    month,
    days,
    weeks: [...state.weeks].map(([start, row]) => ({
      weekStart: dateKey(start, state.offset),
      ...row,
    })),
    totals,
  };
}
// Üretim: yalnız yerel kategori ve fazla mesai sınırlarında parçala.
export function calculateTimesheet(
  shifts: readonly Interval[],
  month: string,
  options: TimesheetOptions,
): Timesheet {
  const s = prepareTimesheet(shifts, month, options);
  for (const shift of s.sorted) {
    let t = shift.start;
    while (t < shift.end) {
      const key = dateKey(t, s.offset);
      const midnight = localMidnight(key, s.offset);
      const hour = (t - midnight) / MINUTE / 60;
      const next = [
        midnight + 6 * 60 * MINUTE,
        midnight + 13 * 60 * MINUTE,
        midnight + 20 * 60 * MINUTE,
        midnight + DAY,
      ].find((bound) => bound > t)!;
      const week = s.weeks.get(weekStart(t, s.offset))!;
      const end = Math.min(shift.end, next);
      const duration = (end - t) / MINUTE;
      const overtimeStart = t + Math.max(0, s.threshold - week.total) * MINUTE;
      const holiday = holidays.get(key);
      const isHoliday = !!holiday && (!holiday.halfDay || hour >= 13);
      const weekday = new Date(t + s.offset * MINUTE).getUTCDay();
      const a = Math.max(t, s.range.start),
        b = Math.min(end, s.range.end);
      if (b > a) {
        const minutes = (b - a) / MINUTE;
        const overtime = Math.max(0, b - Math.max(a, overtimeStart)) / MINUTE;
        const day = s.days.get(key)!;
        day.total += minutes;
        if (hour < 6 || hour >= 20) day.night += minutes;
        if (isHoliday) day.holiday += minutes;
        else if (weekday === 0 || weekday === 6) day.weekend += minutes;
        day.overtime += overtime;
        week.monthTotal += minutes;
        week.monthOvertime += overtime;
      }
      week.overtime += Math.max(0, end - Math.max(t, overtimeStart)) / MINUTE;
      week.total += duration;
      t = end;
    }
  }
  return finishTimesheet(s, month);
}
export function timesheetHours(sheet: Timesheet) {
  const hours = (n: number) => Math.round((n / 60) * 10) / 10;
  const convert = (row: Minutes): Minutes => ({
    total: hours(row.total),
    night: hours(row.night),
    holiday: hours(row.holiday),
    weekend: hours(row.weekend),
    overtime: hours(row.overtime),
  });
  return {
    month: sheet.month,
    days: sheet.days.map((row) => ({ date: row.date, ...convert(row) })),
    weeks: sheet.weeks.map((row) => ({
      weekStart: row.weekStart,
      total: hours(row.total),
      overtime: hours(row.overtime),
      monthTotal: hours(row.monthTotal),
      monthOvertime: hours(row.monthOvertime),
    })),
    totals: convert(sheet.totals),
  };
}