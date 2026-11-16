import { intersectionMinutes } from '../../common/calc/interval.js';
import type { Interval } from '../../common/calc/interval.js';
export const TEAM_SCORE_WEIGHTS = Object.freeze({
  capacityPerHour: 2,
  urgentMultiplier: 2,
  openOrder: -5,
  overdueOrder: -10,
});
export interface ScoredTeam {
  id: number;
  name: string;
  isActive: boolean;
}
export interface ScoredMember {
  id: number;
  teamId: number | null;
  isActive: boolean;
}
export interface CapacityShift extends Interval {
  workforceUserId: number;
}
export interface ScoredOrder {
  id?: number;
  teamId?: number | null;
  status: string;
  priority?: string;
  dueAt: Date;
}
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function scoreTeams(
  workOrder: ScoredOrder,
  teams: readonly ScoredTeam[],
  members: readonly ScoredMember[],
  shifts: readonly CapacityShift[],
  openWorkOrders: readonly ScoredOrder[],
  now: Date,
) {
  if (workOrder.status !== 'OPEN')
    throw new RangeError('Yalnız OPEN iş emrine öneri hesaplanabilir');
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isFinite(workOrder.dueAt.getTime())
  )
    throw new RangeError('Geçersiz değerlendirme zamanı');
  const active = new Map(teams.filter((t) => t.isActive).map((t) => [t.id, t]));
  const memberTeam = new Map<number, number>();
  for (const member of members)
    if (member.isActive && member.teamId !== null && active.has(member.teamId))
      memberTeam.set(member.id, member.teamId);
  const metrics = new Map(
    [...active.keys()].map((id) => [id, { minutes: 0, open: 0, overdue: 0 }]),
  );
  if (workOrder.dueAt > now) {
    const range = { startAt: now, endAt: workOrder.dueAt };
    for (const shift of shifts) {
      const teamId = memberTeam.get(shift.workforceUserId);
      if (teamId !== undefined)
        metrics.get(teamId)!.minutes += intersectionMinutes(shift, range);
    }
  }
  for (const order of openWorkOrders) {
    if (
      order.teamId == null ||
      !['ASSIGNED', 'IN_PROGRESS'].includes(order.status)
    )
      continue;
    const team = metrics.get(order.teamId);
    if (team) {
      team.open++;
      if (order.dueAt < now) team.overdue++;
    }
  }
  const excluded: { teamId: number; name: string; reason: string }[] = [];
  const suggestions = [...active.values()]
    .flatMap((team) => {
      const metric = metrics.get(team.id)!;
      if (metric.minutes <= 0) {
        excluded.push({
          teamId: team.id,
          name: team.name,
          reason: 'NO_CAPACITY',
        });
        return [];
      }
      const capacityHours = metric.minutes / 60;
      const weight =
        TEAM_SCORE_WEIGHTS.capacityPerHour *
        (workOrder.priority === 'URGENT'
          ? TEAM_SCORE_WEIGHTS.urgentMultiplier
          : 1);
      const breakdown = [
        {
          metric: 'capacityHours',
          value: capacityHours,
          weight,
          points: capacityHours * weight,
        },
        {
          metric: 'openWorkOrders',
          value: metric.open,
          weight: TEAM_SCORE_WEIGHTS.openOrder,
          points: metric.open * TEAM_SCORE_WEIGHTS.openOrder,
        },
        {
          metric: 'overdueWorkOrders',
          value: metric.overdue,
          weight: TEAM_SCORE_WEIGHTS.overdueOrder,
          points: metric.overdue * TEAM_SCORE_WEIGHTS.overdueOrder,
        },
      ];
      return [
        {
          teamId: team.id,
          name: team.name,
          capacityHours,
          openWorkOrders: metric.open,
          overdueWorkOrders: metric.overdue,
          score: breakdown.reduce((sum, item) => sum + item.points, 0),
          breakdown,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.openWorkOrders - b.openWorkOrders ||
        compare(a.name, b.name) ||
        a.teamId - b.teamId,
    )
    .slice(0, 3);
  excluded.sort((a, b) => compare(a.name, b.name) || a.teamId - b.teamId);
  return { suggestions, excluded };
}
