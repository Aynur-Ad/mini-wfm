import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { randomUUID } from 'node:crypto';
import { In } from 'typeorm';
import type { Repository } from 'typeorm';
import { WorkOrder } from './entities/work-order.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { WorkOrderStatus } from './work-order.enums.js';
import { WorkOrderEventsPublisher } from './events/work-order-events.publisher.js';
import type { WorkOrderEvent } from './events/work-order-events.js';
import type { Environment } from '../config/environment.js';
import { requestContext } from '../common/logging/request-context.js';
export const OVERDUE_JOB_NAME = 'work-order-overdue';
@Injectable()
export class OverdueWorkOrdersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OverdueWorkOrdersService.name);
  constructor(
    @InjectRepository(WorkOrder) private readonly orders: Repository<WorkOrder>,
    private readonly events: WorkOrderEventsPublisher,
    private readonly config: ConfigService<Environment, true>,
    private readonly scheduler: SchedulerRegistry,
  ) {}
  onApplicationBootstrap(): void {
    const job = CronJob.from({
      cronTime: this.config.getOrThrow('OVERDUE_CHECK_CRON', { infer: true }),
      timeZone: 'UTC',
      waitForCompletion: true,
      onTick: async () => {
        try {
          await this.checkOverdue();
        } catch {
          this.logger.error('Geciken iş emri kontrolü tamamlanamadı');
        }
      },
    });
    this.scheduler.addCronJob(OVERDUE_JOB_NAME, job);
    job.start();
  }
  async checkOverdue(now = new Date()): Promise<number> {
    if (!Number.isFinite(now.getTime()))
      throw new RangeError('Geçersiz kontrol zamanı');
    const correlationId = `cron-${randomUUID()}`;
    return requestContext.run({ correlationId, actor: null }, async () => {
      let found: number | null = null;
      try {
        const pending = await this.orders.manager.transaction(
          async (manager) => {
            const repository = manager.getRepository(WorkOrder);
            // Eşzamanlı kopyalar kilitli kayıtları atlar; aynı iş emri yalnız biri tarafından alınır.
            const orders = await repository
              .createQueryBuilder('workOrder')
              .where('workOrder.dueAt < :now', { now })
              .andWhere('workOrder.overdueNotifiedAt IS NULL')
              .andWhere('workOrder.status NOT IN (:...closed)', {
                closed: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
              })
              .orderBy('workOrder.id', 'ASC')
              .setLock('pessimistic_write')
              .setOnLocked('skip_locked')
              .getMany();
            if (!orders.length) return [];
            const teamIds = [
              ...new Set(
                orders.flatMap((order) =>
                  order.teamId === null ? [] : [order.teamId],
                ),
              ),
            ];
            const members = teamIds.length
              ? await manager.getRepository(WorkforceUser).find({
                  select: { id: true, teamId: true },
                  where: { teamId: In(teamIds), isActive: true },
                  order: { id: 'ASC' },
                })
              : [];
            const recipients = new Map<number, number[]>();
            for (const member of members) {
              const list = recipients.get(member.teamId!) ?? [];
              list.push(member.id);
              recipients.set(member.teamId!, list);
            }
            // Bu teknik işaret kullanıcıya ait düzenleme/version/updatedAt alanlarını değiştirmez.
            await manager.query(
              'UPDATE "workforce"."work_order" SET "overdue_notified_at" = $1 WHERE "id" = ANY($2::int[])',
              [now, orders.map((order) => order.id)],
            );
            return orders.map((order): WorkOrderEvent => ({
              eventId: randomUUID(),
              correlationId,
              workOrderId: order.id,
              workOrderCode: order.code,
              teamId: order.teamId,
              occurredAt: now.toISOString(),
              fromStatus: order.status,
              toStatus: order.status,
              workforceUserIds:
                order.teamId === null
                  ? []
                  : [...(recipients.get(order.teamId) ?? [])],
            }));
          },
        );
        found = pending.length;
        // B22: işaretleme transaction'ı COMMIT olmadan olay yayınlanmaz.
        for (const event of pending)
          await this.events.publish('workOrderOverdue', event);
        return found;
      } finally {
        this.logger.log(
          JSON.stringify({
            correlationId,
            job: OVERDUE_JOB_NAME,
            found,
            completed: found !== null,
          }),
        );
      }
    });
  }
}
