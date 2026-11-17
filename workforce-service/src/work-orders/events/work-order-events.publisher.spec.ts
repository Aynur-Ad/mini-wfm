import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory } from '@nestjs/microservices';
import type { ClientProxy } from '@nestjs/microservices';
import { NEVER, of, throwError } from 'rxjs';
import { WorkOrderEventsPublisher } from './work-order-events.publisher.js';
const event = {
  eventId: '123e4567-e89b-42d3-a456-426614174000',
  correlationId: 'request-123',
  workOrderId: 12,
  workOrderCode: 'IE-2026-00012',
  teamId: 2,
  occurredAt: '2026-11-16T10:00:00Z',
  fromStatus: 'OPEN',
  toStatus: 'ASSIGNED',
  workforceUserIds: [3],
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function setup() {
  const client = {
    emit: vi.fn().mockReturnValue(of(undefined)),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const create = vi
    .spyOn(ClientProxyFactory, 'create')
    .mockReturnValue(client as unknown as ClientProxy);
  const publisher = new WorkOrderEventsPublisher(
    new ConfigService({
      RABBITMQ_URL: 'amqp://127.0.0.1:5672',
      RABBITMQ_QUEUE: 'work_order_events',
      EVENT_PUBLISH_TIMEOUT_MS: 100,
    }),
  );
  return { client, create, publisher };
}
describe('Olay yayınlama', () => {
  it('kalıcı kuyruğa persistent emit yollar; istemciyi kapatır', async () => {
    const { client, create, publisher } = setup();
    await publisher.publish('workOrderAssigned', event);
    expect(client.emit).toHaveBeenCalledWith('workOrderAssigned', event);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          queueOptions: { durable: true },
          persistent: true,
        }),
      }),
    );
    expect(client.close).toHaveBeenCalledOnce();
  });
  it('broker hatası ana işlemi bozmaz', async () => {
    const { client, publisher } = setup();
    client.emit.mockReturnValue(throwError(() => new Error('offline')));
    await expect(
      publisher.publish('workOrderAssigned', event),
    ).resolves.toBeUndefined();
    expect(client.close).toHaveBeenCalledOnce();
  });
  it('bağlanamayan broker sınırsız bekletmez, yeni deneme yeni istemci kullanır', async () => {
    vi.useFakeTimers();
    const { client, create, publisher } = setup();
    client.emit.mockReturnValue(NEVER);
    const pending = publisher.publish('workOrderAssigned', event);
    await vi.advanceTimersByTimeAsync(101);
    await pending;
    expect(client.close).toHaveBeenCalledOnce();
    client.emit.mockReturnValue(of(undefined));
    await publisher.publish('workOrderAssigned', event);
    expect(create).toHaveBeenCalledTimes(2);
  });
  it('gerçek kapalı AMQP portunda da zaman aşımıyla döner', async () => {
    const publisher = new WorkOrderEventsPublisher(
      new ConfigService({
        RABBITMQ_URL: 'amqp://127.0.0.1:1',
        RABBITMQ_QUEUE: 'offline_test',
        EVENT_PUBLISH_TIMEOUT_MS: 100,
      }),
    );
    await expect(
      publisher.publish('workOrderAssigned', event),
    ).resolves.toBeUndefined();
  });
});
