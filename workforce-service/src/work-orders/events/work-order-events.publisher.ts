import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import type { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import type { Environment } from '../../config/environment.js';
import type { WorkOrderEvent } from './work-order-events.js';
@Injectable()
export class WorkOrderEventsPublisher {
  private readonly logger = new Logger(WorkOrderEventsPublisher.name);
  constructor(private readonly config: ConfigService<Environment, true>) {}
  async publish(
    type: 'workOrderStatusChanged' | 'workOrderAssigned' | 'workOrderOverdue',
    event: WorkOrderEvent,
  ): Promise<void> {
    let client: ClientProxy | undefined;
    const metadata = {
      correlationId: event.correlationId,
      eventId: event.eventId,
      type,
    };
    try {
      client = ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls: [this.config.getOrThrow('RABBITMQ_URL', { infer: true })],
          queue: this.config.getOrThrow('RABBITMQ_QUEUE', { infer: true }),
          queueOptions: { durable: true },
          persistent: true,
          socketOptions: {
            connectionOptions: { timeout: 1000 },
            reconnectTimeInSeconds: 1,
          },
        },
      });
      // Broker onayı beklenir; notification-service'in işlemesi beklenmez.
      await firstValueFrom(
        client.emit(type, event).pipe(
          timeout(
            this.config.getOrThrow('EVENT_PUBLISH_TIMEOUT_MS', {
              infer: true,
            }),
          ),
        ),
      );
    } catch {
      // B23: Ham hata, URL, şifre veya olay gövdesi loglanmaz. Ana işlem korunur.
      this.logger.error(
        JSON.stringify({
          ...metadata,
          message: 'RabbitMQ olayı yayınlanamadı; ana işlem korunuyor',
        }),
      );
    } finally {
      // Zaman aşımındaki mesajın bellekte bekleyip çok sonra yayınlanmasını önler.
      try {
        await client?.close();
      } catch {
        this.logger.warn(
          JSON.stringify({
            ...metadata,
            message: 'RabbitMQ istemcisi kapatılamadı',
          }),
        );
      }
    }
  }
}
