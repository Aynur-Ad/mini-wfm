import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { timeout } from 'rxjs';
import {
  requestContext,
  resolveCorrelationId,
} from '../common/logging/request-context.js';
import type { QueryNotificationsDto } from './query-notifications.dto.js';
import type { NotificationListDto } from './notification-response.dto.js';
@Injectable()
export class NotificationsService {
  constructor(
    @Inject('NOTIFICATION_TCP') private readonly client: ClientProxy,
  ) {}
  findAll(query: QueryNotificationsDto) {
    return this.client
      .send<NotificationListDto>('findNotifications', {
        correlationId: resolveCorrelationId(
          requestContext.getStore()?.correlationId,
        ),
        actor: requestContext.getStore()?.actor ?? null,
        data: query,
      })
      .pipe(timeout(3000));
  }
}
