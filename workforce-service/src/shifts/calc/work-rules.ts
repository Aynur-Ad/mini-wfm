import { intersectionMinutes } from '../../common/calc/interval.js';
import type { Interval } from '../../common/calc/interval.js';

const DAY = 24 * 60 * 60_000;
const WEEK = 7 * DAY;
export interface RuleShift extends Interval {
  id?: number;
  workforceUserId: number;
}
export interface WorkRulesOptions {
  timezoneOffsetMinutes: number;
  minRestHours: number;
  maxWeeklyHours: number;
  maxConsecutiveDays: number;
}
export interface ShiftReference {
  id?: number;
  workforceUserId: number;
  startAt: string;
  endAt: string;
  source: 'existing' | 'new';
}
export interface WorkRuleViolation {
  code: 'REST' | 'WEEKLY_LIMIT' | 'CONSECUTIVE_DAYS';
  workforceUserId: number;
  shifts: ShiftReference[];
  value: number;
  limit: number;
  unit: 'minutes' | 'days';
  weekStart?: string;
  fromDate?: string;
  toDate?: string;
}
interface TaggedShift extends RuleShift {
  source: 'existing' | 'new';
}
function groups(
  existing: readonly RuleShift[],
  added: readonly RuleShift[],
): TaggedShift[][] {
  const map = new Map<number, TaggedShift[]>();
  const all: TaggedShift[] = [
    ...existing.map((s) => ({ ...s, source: 'existing' as const })),
    ...added.map((s) => ({ ...s, source: 'new' as const })),
  ];
  for (const shift of all) {
    if (
      !Number.isFinite(shift.startAt.getTime()) ||
      !Number.isFinite(shift.endAt.getTime()) ||
      shift.endAt <= shift.startAt
    )
      throw new RangeError('Geçersiz vardiya aralığı');
    const list = map.get(shift.workforceUserId) ?? [];
    list.push(shift);
    map.set(shift.workforceUserId, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, list]) =>
      list.sort(
        (a, b) =>
          a.startAt.getTime() - b.startAt.getTime() ||
          a.endAt.getTime() - b.endAt.getTime() ||
          (a.id ?? 0) - (b.id ?? 0) ||
          a.source.localeCompare(b.source),
      ),
    );
}
function ref(shift: TaggedShift): ShiftReference {
  return {
    ...(shift.id === undefined ? {} : { id: shift.id }),
    workforceUserId: shift.workforceUserId,
    startAt: shift.startAt.toISOString(),
    endAt: shift.endAt.toISOString(),
    source: shift.source,
  };
}
function restPair(
  previous: TaggedShift,
  next: TaggedShift,
  options: WorkRulesOptions,
): WorkRuleViolation[] {
  const minutes = (next.startAt.getTime() - previous.endAt.getTime()) / 60_000;
  return (previous.source === 'new' || next.source === 'new') &&
    minutes < options.minRestHours * 60
    ? [
        {
          code: 'REST',
          workforceUserId: next.workforceUserId,
          shifts: [ref(previous), ref(next)],
          value: minutes,
          limit: options.minRestHours * 60,
          unit: 'minutes',
        },
      ]
    : [];
}
// P10: ilk for çözümü referans olarak tutulur; servis aşağıdaki dizi sürümünü kullanır.
export function checkRestWithLoop(
  existing: readonly RuleShift[],
  added: readonly RuleShift[],
  options: WorkRulesOptions,
): WorkRuleViolation[] {
  const violations: WorkRuleViolation[] = [];
  for (const shifts of groups(existing, added)) {
    for (let index = 1; index < shifts.length; index++)
      violations.push(...restPair(shifts[index - 1], shifts[index], options));
  }
  return violations;
}
export function checkRest(
  existing: readonly RuleShift[],
  added: readonly RuleShift[],
  options: WorkRulesOptions,
): WorkRuleViolation[] {
  return groups(existing, added).flatMap((shifts) =>
    shifts
      .slice(1)
      .flatMap((next, index) => restPair(shifts[index], next, options)),
  );
}
function localDate(day: number): string {
  return new Date(day * DAY).toISOString().slice(0, 10);
}
function monday(instant: number, offset: number): number {
  const local = new Date(instant + offset);
  const day = Math.floor((instant + offset) / DAY);
  return (day - ((local.getUTCDay() + 6) % 7)) * DAY - offset;
}
export function checkWeeklyLimit(
  existing: readonly RuleShift[],
  added: readonly RuleShift[],
  options: WorkRulesOptions,
): WorkRuleViolation[] {
  const violations: WorkRuleViolation[] = [];
  const offset = options.timezoneOffsetMinutes * 60_000;
  for (const shifts of groups(existing, added)) {
    const affectedWeeks = new Set<number>();
    for (const shift of shifts.filter((s) => s.source === 'new')) {
      for (
        let start = monday(shift.startAt.getTime(), offset);
        start < shift.endAt.getTime();
        start += WEEK
      )
        affectedWeeks.add(start);
    }
    for (const start of [...affectedWeeks].sort((a, b) => a - b)) {
      const week = { startAt: new Date(start), endAt: new Date(start + WEEK) };
      const contributions = shifts
        .map((shift) => ({ shift, minutes: intersectionMinutes(shift, week) }))
        .filter((item) => item.minutes > 0);
      const minutes = contributions.reduce(
        (sum, item) => sum + item.minutes,
        0,
      );
      if (minutes > options.maxWeeklyHours * 60)
        violations.push({
          code: 'WEEKLY_LIMIT',
          workforceUserId: shifts[0].workforceUserId,
          shifts: contributions.map(({ shift }) => ref(shift)),
          value: minutes,
          limit: options.maxWeeklyHours * 60,
          unit: 'minutes',
          weekStart: new Date(start + offset).toISOString().slice(0, 10),
        });
    }
  }
  return violations;
}
export function checkConsecutiveDays(
  existing: readonly RuleShift[],
  added: readonly RuleShift[],
  options: WorkRulesOptions,
): WorkRuleViolation[] {
  const violations: WorkRuleViolation[] = [];
  const offset = options.timezoneOffsetMinutes * 60_000;
  for (const shifts of groups(existing, added)) {
    const days = new Map<number, Set<TaggedShift>>();
    for (const shift of shifts) {
      for (
        let day = Math.floor((shift.startAt.getTime() + offset) / DAY);
        day * DAY < shift.endAt.getTime() + offset;
        day++
      ) {
        const list = days.get(day) ?? new Set<TaggedShift>();
        list.add(shift);
        days.set(day, list);
      }
    }
    const ordered = [...days.keys()].sort((a, b) => a - b);
    let run: number[] = [];
    const finish = () => {
      if (run.length <= options.maxConsecutiveDays) return;
      const related = new Set(run.flatMap((day) => [...days.get(day)!]));
      if (![...related].some((shift) => shift.source === 'new')) return;
      violations.push({
        code: 'CONSECUTIVE_DAYS',
        workforceUserId: shifts[0].workforceUserId,
        shifts: shifts.filter((s) => related.has(s)).map(ref),
        value: run.length,
        limit: options.maxConsecutiveDays,
        unit: 'days',
        fromDate: localDate(run[0]),
        toDate: localDate(run[run.length - 1]),
      });
    };
    for (const day of ordered) {
      if (run.length && day !== run[run.length - 1] + 1) {
        finish();
        run = [];
      }
      run.push(day);
    }
    finish();
  }
  return violations;
}
export function checkWorkRules(
  existingShifts: readonly RuleShift[],
  newShifts: readonly RuleShift[],
  options: WorkRulesOptions,
): WorkRuleViolation[] {
  if (
    !Number.isInteger(options.timezoneOffsetMinutes) ||
    Math.abs(options.timezoneOffsetMinutes) > 840 ||
    ![
      options.minRestHours,
      options.maxWeeklyHours,
      options.maxConsecutiveDays,
    ].every((n) => Number.isFinite(n) && n > 0) ||
    !Number.isInteger(options.maxConsecutiveDays)
  )
    throw new RangeError('Geçersiz çalışma kuralı seçenekleri');
  return [
    ...checkRest(existingShifts, newShifts, options),
    ...checkWeeklyLimit(existingShifts, newShifts, options),
    ...checkConsecutiveDays(existingShifts, newShifts, options),
  ];
}