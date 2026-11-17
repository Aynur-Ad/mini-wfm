import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service.js';
import type { Notification } from './notification.entity.js';
import { event } from '../test/test-event.js';
function setup() {
  const values = vi.fn().mockReturnThis(),
    execute = vi.fn().mockResolvedValue({});
  const builder = {
    insert: vi.fn().mockReturnThis(),
    into: vi.fn().mockReturnThis(),
    values,
    orIgnore: vi.fn().mockReturnThis(),
    execute,
  };
  const query = vi.fn().mockResolvedValue([{ event_id: event.eventId }]);
  const manager = {
    query,
    getRepository: () => ({ createQueryBuilder: () => builder }),
  };
  const transaction = vi.fn(async (work: (m: typeof manager) => unknown) =>
    work(manager),
  );
  const repository = {
    manager: { transaction },
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
  };
  return {
    service: new NotificationsService(
      repository as unknown as Repository<Notification>,
    ),
    values,
    execute,
    query,
    transaction,
    repository,
  };
}
describe('Bildirim kayıtları', () => {
  it('alıcıları tekrarsız seçer ve tüm kayıtları transaction içinde yazar', async () => {
    const s = setup();
    await s.service.handleAssigned(event);
    expect(s.transaction).toHaveBeenCalledOnce();
    expect(
      s.values.mock.calls[0][0].map((row: Notification) => row.workforceUserId),
    ).toEqual([3, 4]);
  });
  it('aynı olay ikinci kez geldiğinde yeni kayıt oluşturmaz', async () => {
    const s = setup();
    await s.service.handleAssigned(event);
    s.query.mockResolvedValue([]);
    await s.service.handleAssigned(event);
    expect(s.execute).toHaveBeenCalledOnce();
  });
  it('geçersiz alıcı veritabanına ulaşmaz', async () => {
    const s = setup();
    await expect(
      s.service.handleAssigned({ ...event, workforceUserIds: [0] }),
    ).rejects.toThrow();
    expect(s.transaction).not.toHaveBeenCalled();
  });
  it('kayıt hatasını rollback için transaction dışına taşır', async () => {
    const s = setup();
    s.execute.mockRejectedValue(new Error('db down'));
    await expect(s.service.handleAssigned(event)).rejects.toThrow('db down');
  });
  it('P2 biçiminde sayfalı, filtreli ve en yeni önce listeler', async () => {
    const s = setup();
    expect(
      await s.service.findAll({ workforceUserId: 3, page: 2, limit: 5 }),
    ).toEqual({ data: [], total: 0, page: 2, limit: 5 });
    expect(s.repository.findAndCount).toHaveBeenCalledWith({
      where: { workforceUserId: 3 },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: 5,
      take: 5,
    });
  });
  it.each([
    { workforceUserId: 0 },
    { workforceUserId: 3, page: 0 },
    { workforceUserId: 3, limit: 101 },
  ])('geçersiz sorguyu 400 ile reddeder: %o', async (query) => {
    await expect(setup().service.findAll(query)).rejects.toMatchObject({
      error: { statusCode: 400 },
    });
  });
});
