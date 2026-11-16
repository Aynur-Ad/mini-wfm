import { performance } from 'node:perf_hooks';
import { scoreTeams } from '../src/work-orders/calc/team-score.js';
const now = new Date('2026-11-01T00:00:00Z'),
  end = new Date(now.getTime() + 7 * 86400000),
  order = { status: 'OPEN', priority: 'MEDIUM', dueAt: end };
const teams = Array.from({ length: 50 }, (_, id) => ({
  id,
  name: `T${id}`,
  isActive: true,
}));
const members = Array.from({ length: 1000 }, (_, id) => ({
  id,
  teamId: id % 50,
  isActive: true,
}));
const shifts = Array.from({ length: 10000 }, (_, i) => ({
  workforceUserId: i % 1000,
  startAt: now,
  endAt: new Date(now.getTime() + 3600000),
}));
const samples = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  scoreTeams(order, teams, members, shifts, [], now);
  if (i >= 3) samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
console.log(
  `50 ekip / 1000 personel / 10000 vardiya: medyan ${samples[8].toFixed(3)} ms, en yüksek ${samples.at(-1)!.toFixed(3)} ms`,
);
