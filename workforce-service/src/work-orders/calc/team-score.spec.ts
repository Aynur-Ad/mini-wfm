import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { scoreTeams } from './team-score.js';
const now = new Date('2026-11-01T00:00:00Z'),
  end = new Date('2026-11-08T00:00:00Z');
const order = { status: 'OPEN', priority: 'MEDIUM', dueAt: end };
const teams = [
  { id: 1, name: 'A', isActive: true },
  { id: 2, name: 'B', isActive: true },
  { id: 3, name: 'C', isActive: true },
];
const members = [
  { id: 1, teamId: 1, isActive: true },
  { id: 2, teamId: 2, isActive: true },
];
const shifts = [
  {
    workforceUserId: 1,
    startAt: now,
    endAt: new Date(now.getTime() + 16 * 3600000),
  },
  {
    workforceUserId: 2,
    startAt: now,
    endAt: new Date(now.getTime() + 24 * 3600000),
  },
];
const orders = [
  ...Array.from({ length: 2 }, () => ({
    teamId: 1,
    status: 'ASSIGNED',
    dueAt: end,
  })),
  ...Array.from({ length: 3 }, () => ({
    teamId: 2,
    status: 'IN_PROGRESS',
    dueAt: end,
  })),
  { teamId: 2, status: 'ASSIGNED', dueAt: new Date(now.getTime() - 1) },
];
describe('Ekip puan hesabı', () => {
  it.each([
    ['MEDIUM', ['A', 'B'], [22, 18]],
    ['URGENT', ['B', 'A'], [66, 54]],
  ] as const)('%s örnek tablo', (priority, names, points) => {
    const result = scoreTeams(
      { ...order, priority },
      teams,
      members,
      shifts,
      orders,
      now,
    );
    expect(result.suggestions.map((t) => t.name)).toEqual(names);
    expect(result.suggestions.map((t) => t.score)).toEqual(points);
    expect(result.excluded).toEqual([
      { teamId: 3, name: 'C', reason: 'NO_CAPACITY' },
    ]);
    for (const team of result.suggestions)
      expect(team.breakdown.reduce((sum, x) => sum + x.points, 0)).toBe(
        team.score,
      );
  });
  it('aralığı kırpar, pasif üyeyi ve kapanmış işi saymaz', () => {
    const result = scoreTeams(
      order,
      teams,
      [...members, { id: 3, teamId: 1, isActive: false }],
      [
        {
          workforceUserId: 1,
          startAt: new Date(now.getTime() - 3600000),
          endAt: new Date(now.getTime() + 3600000),
        },
        { workforceUserId: 3, startAt: now, endAt: end },
      ],
      [{ teamId: 1, status: 'COMPLETED', dueAt: now }],
      now,
    );
    expect(result.suggestions[0]).toMatchObject({
      capacityHours: 1,
      openWorkOrders: 0,
      score: 2,
    });
  });
  it('eşit puanda yük, ad ve ID sırası; ilk üç ekip, sırasız girdi değişmez', () => {
    const ts = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: String.fromCharCode(65 + i),
      isActive: true,
    }));
    const ms = ts.map((t) => ({ id: t.id, teamId: t.id, isActive: true }));
    const ss = ms.map((m) => ({
      workforceUserId: m.id,
      startAt: now,
      endAt: new Date(now.getTime() + 3600000),
    }));
    const before = JSON.stringify([ts, ms, ss]);
    const result = scoreTeams(order, [...ts].reverse(), ms, ss, [], now);
    expect(result.suggestions.map((t) => t.name)).toEqual(['A', 'B', 'C']);
    expect(JSON.stringify([ts, ms, ss])).toBe(before);
  });
  it('eşit puanda açık yükü az olan ekip adından bağımsız önce gelir', () => {
    const clipped = [
      {
        workforceUserId: 1,
        startAt: now,
        endAt: new Date(now.getTime() + 5.5 * 3600000),
      },
      {
        workforceUserId: 2,
        startAt: now,
        endAt: new Date(now.getTime() + 3 * 3600000),
      },
    ];
    const result = scoreTeams(
      order,
      teams,
      members,
      clipped,
      [{ teamId: 1, status: 'ASSIGNED', dueAt: end }],
      now,
    );
    expect(result.suggestions.map((t) => [t.name, t.score])).toEqual([
      ['B', 6],
      ['A', 6],
    ]);
  });
  it('kapasite aralığı bitmişse tamamı excluded olur; OPEN olmayan reddedilir', () => {
    expect(
      scoreTeams({ ...order, dueAt: now }, teams, members, shifts, orders, now)
        .suggestions,
    ).toEqual([]);
    expect(() =>
      scoreTeams(
        { ...order, status: 'ASSIGNED' },
        teams,
        members,
        shifts,
        orders,
        now,
      ),
    ).toThrow();
  });
  it('50 ekip, 1000 personel, 10000 vardiyada medyan 50 ms altındadır', () => {
    const ts = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `T${i}`,
      isActive: true,
    }));
    const ms = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      teamId: i % 50,
      isActive: true,
    }));
    const ss = Array.from({ length: 10000 }, (_, i) => ({
      workforceUserId: i % 1000,
      startAt: now,
      endAt: new Date(now.getTime() + 3600000),
    }));
    const durations = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const result = scoreTeams(order, ts, ms, ss, [], now);
      expect(result.suggestions).toHaveLength(3);
      if (i >= 3) durations.push(performance.now() - start);
    }
    durations.sort((a, b) => a - b);
    expect(durations[3]).toBeLessThan(50);
  });
});
