import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import type { WorkOrder } from './entities/work-order.entity.js';
import { WorkOrdersService } from './work-orders.service.js';
import type { QueryWorkOrdersDto } from './dto/query-work-orders.dto.js';

function setup() {
  const query = {
    leftJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    setParameters: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    clone: vi.fn(),
    getRawMany: vi.fn().mockResolvedValue([]),
  };
  query.clone.mockReturnValue({ getCount: vi.fn().mockResolvedValue(14) });
  const repository = { createQueryBuilder: vi.fn().mockReturnValue(query) };
  return {
    query,
    service: new WorkOrdersService(
      repository as unknown as Repository<WorkOrder>,
    ),
    repository,
  };
}

describe('İş emri liste sorgusu', () => {
  it('total ve sayfayı korur, atanmayan işi null ekiple döndürür; SQL yardımcı alanlarını çıkarır', async () => {
    const { service, query } = setup();
    query.getRawMany.mockResolvedValue([
      {
        id: 1,
        joinedTeamId: null,
        teamName: null,
        isOverdue: true,
        priority_rank: 2,
      },
    ]);
    const result = await service.findAll({ page: 2, limit: 5 });
    expect(result).toEqual({
      data: [{ id: 1, isOverdue: true, team: null }],
      total: 14,
      page: 2,
      limit: 5,
    });
    expect(query.offset).toHaveBeenCalledWith(5);
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.orderBy).toHaveBeenCalledWith('wo.createdAt', 'DESC');
    expect(query.addOrderBy).toHaveBeenCalledWith('wo.id', 'DESC');
  });
  it('ekip özetini yalnız ID ve adla döndürür', async () => {
    const { service, query } = setup();
    query.getRawMany.mockResolvedValue([
      { id: 1, joinedTeamId: 7, teamName: 'Saha', priority_rank: 4 },
    ]);
    expect((await service.findAll()).data[0].team).toEqual({
      id: 7,
      name: 'Saha',
    });
  });
  it.each(['createdAt', 'dueAt', 'priority'] as const)(
    'izinli %s sıralaması sabit SQLden seçilir',
    async (sortBy) => {
      const { service, query } = setup();
      await service.findAll({ sortBy, sortOrder: 'asc' });
      expect(query.orderBy).toHaveBeenCalledWith(
        sortBy === 'priority' ? 'priority_rank' : `wo.${sortBy}`,
        'ASC',
      );
    },
  );
  it.each([
    { sortBy: 'name;DROP TABLE team' },
    { sortBy: 'constructor' },
    { sortBy: '__proto__' },
    { sortOrder: 'desc;DELETE' },
  ])('TCPden geçersiz sıralama gelse de sorgu çalışmaz: %j', async (input) => {
    const { service, repository } = setup();
    await expect(
      service.findAll(input as QueryWorkOrdersDto),
    ).rejects.toMatchObject({ error: { statusCode: 400 } });
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });
  it('bütün filtreler parametreli birleşir; SQL filtre/alan hesabında aynı an kullanılır', async () => {
    const { service, query } = setup();
    await service.findAll({
      search: "  %_'\\  ",
      status: ['OPEN', 'ASSIGNED'] as QueryWorkOrdersDto['status'],
      priority: 'HIGH' as QueryWorkOrdersDto['priority'],
      teamId: 3,
      overdue: true,
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      '(wo.code ILIKE :search OR wo.title ILIKE :search)',
      { search: "%\\%\\_'\\\\%" },
    );
    expect(query.andWhere).toHaveBeenCalledWith('wo.status IN (:...statuses)', {
      statuses: ['OPEN', 'ASSIGNED'],
    });
    expect(query.andWhere).toHaveBeenCalledWith('wo.priority = :priority', {
      priority: 'HIGH',
    });
    expect(query.andWhere).toHaveBeenCalledWith('wo.teamId = :teamId', {
      teamId: 3,
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      '(wo.dueAt < :now AND wo.status NOT IN (:...closed))',
    );
    expect(query.setParameters).toHaveBeenCalledWith({
      now: expect.any(Date),
      closed: ['COMPLETED', 'CANCELLED'],
    });
  });
  it('boş arama ve overdue=false ek filtre oluşturmaz', async () => {
    const { service, query } = setup();
    await service.findAll({ search: '  ', overdue: false });
    expect(query.andWhere).not.toHaveBeenCalled();
  });
});