import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { ShiftPlanningService } from './shift-planning.service.js';
import { Shift } from './entities/shift.entity.js';
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { DEFAULT_WORK_RULE_OPTIONS } from '../config/work-rules.config.js';
import { requestContext } from '../common/logging/request-context.js';
import { AccountRole } from '../accounts/account-role.js';
function setup(count = 4) {
  const builder = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    setLock: vi.fn().mockReturnThis(),
    getMany: vi
      .fn()
      .mockResolvedValue(
        Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          registrationNumber: `P${i + 1}`,
        })),
      ),
  };
  const repo = {
    find: vi.fn().mockResolvedValue([]),
    create: vi.fn((x) => x),
    save: vi.fn().mockResolvedValue([]),
    manager: { transaction: vi.fn() },
  };
  repo.manager.transaction.mockImplementation(async (work) =>
    work({
      getRepository: (entity: unknown) =>
        entity === Team
          ? { findOne: async () => ({ id: 1, isActive: true }) }
          : entity === WorkforceUser
            ? { createQueryBuilder: () => builder }
            : repo,
    }),
  );
  return {
    repo,
    builder,
    service: new ShiftPlanningService(
      repo as unknown as Repository<Shift>,
      DEFAULT_WORK_RULE_OPTIONS,
    ),
  };
}
const request = {
  startDate: '2035-01-01',
  days: 7,
  slots: [
    { name: 'Sabah', startTime: '08:00', endTime: '16:00', requiredCount: 1 },
    { name: 'Akşam', startTime: '16:00', endTime: '24:00', requiredCount: 1 },
    { name: 'Gece', startTime: '00:00', endTime: '08:00', requiredCount: 1 },
  ],
};
const actor = { id: 7, username: 'planner', role: AccountRole.PLANNER };
describe('Rotasyon service transaction', () => {
  it('önizleme save yapmaz, kilit ve actor gerektirmez', async () => {
    const { repo, builder, service } = setup();
    expect((await service.rotation(1, request)).assignments).toHaveLength(21);
    expect(repo.save).not.toHaveBeenCalled();
    expect(builder.setLock).not.toHaveBeenCalled();
  });
  it('eksik plan hiçbir kaydı yazmadan 409 verir', async () => {
    const { repo, service } = setup(3);
    await expect(
      requestContext.run({ correlationId: 'test', actor }, () =>
        service.rotation(1, { ...request, apply: true }),
      ),
    ).rejects.toMatchObject({
      error: { statusCode: 409, message: 'Plan tamamlanamadı' },
    });
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('tam plan tek transactionda tek save ile actor kimliğiyle kaydedilir', async () => {
    const { repo, builder, service } = setup();
    const result = await requestContext.run(
      { correlationId: 'test', actor },
      () => service.rotation(1, { ...request, apply: true }),
    );
    expect(result.applied).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(repo.create.mock.calls.every(([row]) => row.createdById === 7)).toBe(
      true,
    );
    expect(builder.setLock).toHaveBeenCalledWith('pessimistic_write');
  });
  it('apply actor olmadan 401 verir', async () => {
    const { service } = setup();
    await expect(
      service.rotation(1, { ...request, apply: true }),
    ).rejects.toMatchObject({ error: { statusCode: 401 } });
  });
});