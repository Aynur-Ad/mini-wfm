import { Controller, Inject, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import type { Channel, ConsumeMessage } from 'amqplib';
import { NotificationsService } from './notifications.service.js';
import type { NotificationQuery } from './notifications.service.js';
import type { WorkOrderEvent } from './work-order-event.js';
import { readEvent, InvalidEventError } from './event-validation.js';
import {
  requestContext,
  resolveCorrelationId,
} from '../common/logging/request-context.js';
@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);
  constructor(
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}
  @EventPattern<string>('workOrderAssigned', Transport.RMQ)
  handleAssigned(@Payload() data: unknown, @Ctx() context: RmqContext) {
    return this.consume(data, context, true);
  }
  @EventPattern<string>('workOrderStatusChanged', Transport.RMQ)
  handleStatusChanged(@Payload() data: unknown, @Ctx() context: RmqContext) {
    return this.consume(data, context, false);
  }
  private async consume(data: unknown, context: RmqContext, assigned: boolean) {
    const channel = context.getChannelRef() as Channel,
      message = context.getMessage() as ConsumeMessage;
    return requestContext.run(
      {
        correlationId: resolveCorrelationId(
          (data as Partial<WorkOrderEvent> | null)?.correlationId,
        ),
      },
      async () => {
        try {
          const event = readEvent(data, assigned);
          if (assigned) await this.notifications.handleAssigned(event);
          this.logger.log(
            JSON.stringify({
              eventId: event.eventId,
              type: assigned ? 'workOrderAssigned' : 'workOrderStatusChanged',
              phase: assigned ? 'stored' : 'received',
            }),
          );
        } catch (error) {
          const invalid = error instanceof InvalidEventError;
          this.logger.error(
            invalid
              ? 'Geçersiz olay reddedildi'
              : 'Bildirim kaydı başarısız; mesaj yeniden kuyruğa alınıyor',
          );
          channel.nack(message, false, !invalid);
          return;
        }
        // DB transaction COMMIT edilmeden ack gönderilmez.
        channel.ack(message);
      },
    );
  }
  @MessagePattern('findNotifications', Transport.TCP)
  findAll(
    @Payload() envelope: { correlationId?: string; data: NotificationQuery },
  ) {
    return requestContext.run(
      { correlationId: resolveCorrelationId(envelope?.correlationId) },
      () => {
        this.logger.log('Bildirim listesi istendi');
        return this.notifications.findAll(envelope?.data);
      },
    );
  }
}
