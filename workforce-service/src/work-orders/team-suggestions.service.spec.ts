import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { TeamSuggestionsService } from './team-suggestions.service.js';
import { WorkOrder } from './entities/work-order.entity.js';
import { Team } from '../teams/entities/team.entity.js';
function setup(status = 'OPEN') {
  const calls: string[] = [];
  const builder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getMany: vi.fn(async () => {
      calls.push('teams');
      return [
        {
          id: 1,
          name: 'A',
          isActive: true,
          members: [{ id: 1, teamId: 1, isActive: true }],
        },
      ];
    }),
  };
  const repo = {
    findOneBy: vi.fn(async () => {
      calls.push('target');
      return {
        status,
        priority: 'MEDIUM',
        dueAt: new Date(Date.now() + 86400000),
      };
    }),
    find: vi.fn(async () => {
      calls.push('workload');
      return [];
    }),
    manager: {
      getRepository: (entity: unknown) =>
        entity === Team
          ? { createQueryBuilder: () => builder }
          : {
              find: async () => {
                calls.push('shifts');
                return [
                  {
                    workforceUserId: 1,
                    startAt: new Date(),
                    endAt: new Date(Date.now() + 3600000),
                  },
                ];
              },
            },
    },
  };
  return {
    calls,
    repo,
    service: new TeamSuggestionsService(
      repo as unknown as Repository<WorkOrder>,
    ),
  };
}
describe('Ekip önerisi service', () => {
  it('hedef+ekip üyeleri+vardiya+iş yükü dört okumadır', async () => {
    const { calls, service } = setup();
    const result = await service.suggest(1);
    expect(calls).toEqual(['target', 'teams', 'shifts', 'workload']);
    expect(result.suggestions[0].teamId).toBe(1);
  });
  it.each(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])(
    '%s durumunda yalnız hedef okunup 409 döner',
    async (status) => {
      const { calls, service } = setup(status);
      await expect(service.suggest(1)).rejects.toMatchObject({
        error: { statusCode: 409 },
      });
      expect(calls).toEqual(['target']);
    },
  );
});
