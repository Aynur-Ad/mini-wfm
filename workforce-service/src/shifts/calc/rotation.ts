import {
  DAY,
  MINUTE,
  localMidnight,
  dateKey,
} from '../../common/calc/local-time.js';
import { checkWorkRules } from './work-rules.js';
import type { RuleShift, WorkRulesOptions } from './work-rules.js';
export interface RotationMember {
  id: number;
  registrationNumber: string;
  firstName?: string;
  lastName?: string;
}
export interface RotationSlot {
  name: string;
  startTime: string;
  endTime: string;
  requiredCount: number;
}
export interface RotationRequest {
  startDate: string;
  days: number;
  slots: readonly RotationSlot[];
  apply?: boolean;
}
export interface RotationAssignment {
  date: string;
  slot: string;
  workforceUserId: number;
  registrationNumber: string;
  startAt: string;
  endAt: string;
}
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
function time(value: string, end = false) {
  if (
    !(
      end
        ? /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/
        : /^(?:[01]\d|2[0-3]):[0-5]\d$/
    ).test(value)
  )
    throw new RangeError('Geçersiz kalıp saati');
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
export function rotationRange(
  request: RotationRequest,
  options: WorkRulesOptions,
) {
  const start = localMidnight(request.startDate, options.timezoneOffsetMinutes);
  if (
    !Number.isInteger(request.days) ||
    request.days < 1 ||
    request.days > 14 ||
    request.slots.length < 1 ||
    request.slots.length > 24
  )
    throw new RangeError('Geçersiz plan süresi veya kalıp sayısı');
  const names = new Set<string>();
  for (const slot of request.slots) {
    const a = time(slot.startTime),
      b = time(slot.endTime, true);
    const minutes = (b - a + 1440) % 1440;
    if (
      !slot.name.trim() ||
      names.has(slot.name) ||
      !Number.isInteger(slot.requiredCount) ||
      slot.requiredCount < 1 ||
      slot.requiredCount > 100 ||
      minutes < 60 ||
      minutes > 720
    )
      throw new RangeError('Geçersiz veya tekrarlanan vardiya kalıbı');
    names.add(slot.name);
  }
  return { start, end: start + (request.days + 1) * DAY };
}
// sortSlots=false yalnız test referansı için; HTTP sözleşmesinde böyle bir seçenek yoktur.
export function buildRotationCore(
  members: readonly RotationMember[],
  existingShifts: readonly RuleShift[],
  request: RotationRequest,
  options: WorkRulesOptions,
  sortSlots: boolean,
) {
  const { start } = rotationRange(request, options);
  const planned = new Map<number, RuleShift[]>();
  const existing = new Map<number, RuleShift[]>();
  const minutes = new Map(members.map((m) => [m.id, 0]));
  for (const shift of existingShifts) {
    const list = existing.get(shift.workforceUserId) ?? [];
    list.push(shift);
    existing.set(shift.workforceUserId, list);
  }
  const slots = [...request.slots];
  if (sortSlots)
    slots.sort(
      (a, b) =>
        time(a.startTime) - time(b.startTime) || compare(a.name, b.name),
    );
  const assignments: RotationAssignment[] = [];
  const unfilled: {
    date: string;
    slot: string;
    missing: number;
    reasonCodes: string[];
  }[] = [];
  for (let day = 0; day < request.days; day++)
    for (const slot of slots) {
      const a = start + day * DAY + time(slot.startTime) * MINUTE;
      let b = start + day * DAY + time(slot.endTime, true) * MINUTE;
      if (b <= a) b += DAY;
      const reasons = new Set<string>();
      const candidates = members
        .filter((member) => {
          const next = {
            workforceUserId: member.id,
            startAt: new Date(a),
            endAt: new Date(b),
          };
          const old = existing.get(member.id) ?? [],
            added = planned.get(member.id) ?? [];
          if (
            [...old, ...added].some(
              (s) => s.startAt.getTime() < b && s.endAt.getTime() > a,
            )
          ) {
            reasons.add('OVERLAP');
            return false;
          }
          const violations = checkWorkRules(old, [...added, next], options);
          for (const violation of violations) reasons.add(violation.code);
          return violations.length === 0;
        })
        .sort(
          (x, y) =>
            minutes.get(x.id)! - minutes.get(y.id)! ||
            compare(x.registrationNumber, y.registrationNumber) ||
            x.id - y.id,
        )
        .slice(0, slot.requiredCount);
      for (const member of candidates) {
        const list = planned.get(member.id) ?? [];
        list.push({
          workforceUserId: member.id,
          startAt: new Date(a),
          endAt: new Date(b),
        });
        planned.set(member.id, list);
        minutes.set(member.id, minutes.get(member.id)! + (b - a) / MINUTE);
        assignments.push({
          date: dateKey(a, options.timezoneOffsetMinutes),
          slot: slot.name,
          workforceUserId: member.id,
          registrationNumber: member.registrationNumber,
          startAt: new Date(a).toISOString(),
          endAt: new Date(b).toISOString(),
        });
      }
      if (candidates.length < slot.requiredCount)
        unfilled.push({
          date: dateKey(a, options.timezoneOffsetMinutes),
          slot: slot.name,
          missing: slot.requiredCount - candidates.length,
          reasonCodes: reasons.size
            ? [...reasons].sort()
            : ['INSUFFICIENT_MEMBERS'],
        });
    }
  const totals = [...members]
    .sort(
      (a, b) =>
        compare(a.registrationNumber, b.registrationNumber) || a.id - b.id,
    )
    .map((member) => ({
      workforceUserId: member.id,
      registrationNumber: member.registrationNumber,
      minutes: minutes.get(member.id)!,
      hours: Math.round((minutes.get(member.id)! / 60) * 10) / 10,
    }));
  const values = totals.map((t) => t.minutes);
  return {
    assignments,
    totals,
    unfilled,
    fairnessHours: values.length
      ? Math.round(((Math.max(...values) - Math.min(...values)) / 60) * 10) / 10
      : 0,
  };
}
export function buildRotationPlan(
  members: readonly RotationMember[],
  existing: readonly RuleShift[],
  request: RotationRequest,
  options: WorkRulesOptions,
) {
  return buildRotationCore(members, existing, request, options, true);
}