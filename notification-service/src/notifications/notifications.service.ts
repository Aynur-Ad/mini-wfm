import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import type { Repository } from 'typeorm';
import { Notification } from './notification.entity.js';
import type { WorkOrderEvent } from './work-order-event.js';
import { readEvent } from './event-validation.js';
export interface NotificationQuery {
  workforceUserId: number;
  page?: number;
  limit?: number;
}
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}
  async handleAssigned(input: WorkOrderEvent): Promise<void> {
    const event = readEvent(input, true);
    return this.store(
      event,
      'workOrderAssigned',
      'Yeni iş emri atandı',
      `${event.workOrderCode} numaralı iş emri ekibinize atandı.`,
    );
  }
  async handleOverdue(input: WorkOrderEvent): Promise<void> {
    const event = readEvent(input, 'overdue');
    return this.store(
      event,
      'workOrderOverdue',
      'İş emri gecikti',
      `${event.workOrderCode} numaralı iş emrinin süresi doldu.`,
    );
  }
  private async store(
    event: WorkOrderEvent,
    type: string,
    title: string,
    body: string,
  ): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      // Kaynak eventId burada tekildir; paralel teslimler PK üzerinde bekler.
      const rows = await manager.query<{ event_id: string }[]>(
        'INSERT INTO "notification"."processed_event" ("event_id") VALUES ($1) ON CONFLICT ("event_id") DO NOTHING RETURNING "event_id"',
        [event.eventId],
      );
      if (!rows.length) return;
      const ids = [...new Set(event.workforceUserIds)];
      if (!ids.length) return;
      await manager
        .getRepository(Notification)
        .createQueryBuilder()
        .insert()
        .into(Notification)
        .values(
          ids.map((workforceUserId) => ({
            eventId: event.eventId,
            type,
            workforceUserId,
            title,
            body,
          })),
        )
        .orIgnore()
        .execute();
      // Marker ve bütün alıcılar aynı transaction'da yazılır; hata varsa hepsi geri alınır.
    });
  }
  async findAll(query: NotificationQuery) {
    const { workforceUserId, page = 1, limit = 10 } = query ?? {};
    if (
      !Number.isInteger(workforceUserId) ||
      workforceUserId < 1 ||
      workforceUserId > 2147483647 ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 2147483647 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new RpcException({
        statusCode: 400,
        message: 'Personel ID, sayfa veya limit geçersiz',
      });
    const [data, total] = await this.repository.findAndCount({
      where: { workforceUserId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }
}
