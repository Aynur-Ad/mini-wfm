import { calculateTimesheetReference } from '../src/test/timesheet.reference.js';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { calculateTimesheet } from '../src/shifts/calc/timesheet.js';
const rows = Array.from({ length: 22 }, (_, i) => ({
  startAt: new Date(Date.UTC(2026, 10, i + 1, 5)),
  endAt: new Date(Date.UTC(2026, 10, i + 1, 13)),
}));
const options = { timezoneOffsetMinutes: 180 };
assert.deepEqual(
  calculateTimesheet(rows, '2026-11', options),
  calculateTimesheetReference(rows, '2026-11', options),
);
for (let i = 0; i < 10; i++) {
  calculateTimesheet(rows, '2026-11', options);
  calculateTimesheetReference(rows, '2026-11', options);
}
for (const [name, fn] of [
  ['minute', calculateTimesheetReference],
  ['split', calculateTimesheet],
] as const) {
  const start = performance.now();
  for (let person = 0; person < 1000; person++) fn(rows, '2026-11', options);
  console.log(
    `${name}: ${(performance.now() - start).toFixed(2)} ms; 1000 personel x 1 ay, 22 vardiya/personel`,
  );
}