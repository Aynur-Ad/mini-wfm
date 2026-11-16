import { MINUTE, weekStart } from '../common/calc/local-time.js';
import { HOLIDAYS } from '../shifts/calc/holidays.js';
import type { Interval } from '../common/calc/interval.js';
import { prepareTimesheet, finishTimesheet } from '../shifts/calc/timesheet.js';
import type { TimesheetOptions, Timesheet } from '../shifts/calc/timesheet.js';
const holidays = new Map(HOLIDAYS.map((h) => [h.date, h]));
// Referans: kategori tespiti her dakika yeniden yapılır; üretim servisi kullanmaz.
export function calculateTimesheetReference(
  shifts: readonly Interval[],
  month: string,
  options: TimesheetOptions,
): Timesheet {
  const s = prepareTimesheet(shifts, month, options);
  for (const shift of s.sorted) {
    for (let t = shift.start; t < shift.end;) {
      const end = Math.min(shift.end, (Math.floor(t / MINUTE) + 1) * MINUTE);
      const minutes = (end - t) / MINUTE;
      const wall = new Date(t + s.offset * MINUTE);
      const key = wall.toISOString().slice(0, 10);
      const minute = wall.getUTCHours() * 60 + wall.getUTCMinutes();
      const week = s.weeks.get(weekStart(t, s.offset))!;
      const overtime =
        Math.max(0, week.total + minutes - s.threshold) -
        Math.max(0, week.total - s.threshold);
      if (t >= s.range.start && t < s.range.end) {
        const row = s.days.get(key)!;
        row.total += minutes;
        row.overtime += overtime;
        week.monthTotal += minutes;
        week.monthOvertime += overtime;
        if (minute < 360 || minute >= 1200) row.night += minutes;
        const h = holidays.get(key);
        if (h && (!h.halfDay || minute >= 780)) row.holiday += minutes;
        else if (wall.getUTCDay() === 0 || wall.getUTCDay() === 6)
          row.weekend += minutes;
      }
      week.total += minutes;
      week.overtime += overtime;
      t = end;
    }
  }
  return finishTimesheet(s, month);
}