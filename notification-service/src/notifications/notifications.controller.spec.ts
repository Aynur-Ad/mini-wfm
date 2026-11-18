import { describe, expect, it, vi } from 'vitest';
import { RmqContext } from '@nestjs/microservices';
import { NotificationsController } from './notifications.controller.js';
import type { NotificationsService } from './notifications.service.js';
import { requestContext } from '../common/logging/request-context.js';
import { event } from '../test/test-event.js';
const overdueEvent = { ...event, fromStatus: 'ASSIGNED' };
function setup() {
  const ack = vi.fn(),
    nack = vi.fn(),
    message = {};
  const context = new RmqContext([message, { ack, nack }, 'workOrderAssigned']);
  const handleOverdue = vi.fn().mockResolvedValue(undefined);
  const handleAssigned = vi.fn().mockResolvedValue(undefined),
    findAll = vi.fn().mockResolvedValue({ data: [] });
  return {
    ack,
    nack,
    message,
    context,
    handleAssigned,
    handleOverdue,
    findAll,
    controller: new NotificationsController({
      handleAssigned,
      handleOverdue,
      findAll,
    } as unknown as NotificationsService),
  };
}
describe('RabbitMQ manuel ACK', () => {
  it('COMMIT tamamlanmadan ack göndermez; correlation id kayıt sırasında korunur', async () => {
    const s = setup();
    let release!: () => void;
    s.handleAssigned.mockImplementation(() => {
      expect(requestContext.getStore()?.correlationId).toBe('request-123');
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    const pending = s.controller.handleAssigned(event, s.context);
    expect(s.ack).not.toHaveBeenCalled();
    release();
    await pending;
    expect(s.ack).toHaveBeenCalledWith(s.message);
    expect(s.nack).not.toHaveBeenCalled();
  });
  it('DB hatasında ack yok; mesaj tekrar kuyruğa alınır', async () => {
    const s = setup();
    s.handleAssigned.mockRejectedValue(new Error('db down'));
    await s.controller.handleAssigned(event, s.context);
    expect(s.ack).not.toHaveBeenCalled();
    expect(s.nack).toHaveBeenCalledWith(s.message, false, true);
  });
  it('geçersiz olay tekrar kuyruğa konmaz, DB çağrılmaz', async () => {
    const s = setup();
    await s.controller.handleAssigned({ ...event, eventId: 'bad' }, s.context);
    expect(s.handleAssigned).not.toHaveBeenCalled();
    expect(s.nack).toHaveBeenCalledWith(s.message, false, false);
  });
  it('durum olayı bildirim oluşturmadan ack edilir', async () => {
    const s = setup();
    await s.controller.handleStatusChanged(event, s.context);
    expect(s.handleAssigned).not.toHaveBeenCalled();
    expect(s.ack).toHaveBeenCalledOnce();
  });
  it('TCP okumada zarfı açar, correlation id taşır', async () => {
    const s = setup();
    s.findAll.mockImplementation(async () => {
      expect(requestContext.getStore()?.correlationId).toBe('tcp-test');
      return { data: [] };
    });
    await s.controller.findAll({
      correlationId: 'tcp-test',
      data: { workforceUserId: 3 },
    });
    expect(s.findAll).toHaveBeenCalledWith({ workforceUserId: 3 });
  });
  it('gecikme mesajını kaydettikten sonra ack eder', async () => {
    const s = setup();
    await s.controller.handleOverdue(overdueEvent, s.context);
    expect(s.handleOverdue).toHaveBeenCalledWith(overdueEvent);
    expect(s.ack).toHaveBeenCalledOnce();
  });
  it('gecikme kaydında hata olursa yeniden kuyruğa alır', async () => {
    const s = setup();
    s.handleOverdue.mockRejectedValue(new Error('db down'));
    await s.controller.handleOverdue(overdueEvent, s.context);
    expect(s.ack).not.toHaveBeenCalled();
    expect(s.nack).toHaveBeenCalledWith(s.message, false, true);
  });
});
