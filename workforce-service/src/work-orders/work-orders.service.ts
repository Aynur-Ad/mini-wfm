import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WorkOrder } from './entities/work-order.entity.js';
import { WorkOrderPriority, WorkOrderStatus } from './work-order.enums.js';
import type { CreateWorkOrderDto } from './dto/create-work-order.dto.js';
import type { UpdateWorkOrderDto } from './dto/update-work-order.dto.js';
import { requestContext } from '../common/logging/request-context.js';

function fail(statusCode: number, message: string): never {
  throw new RpcException({ statusCode, message });
}

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrder) private readonly orders: Repository<WorkOrder>,
  ) {}

  async create(dto: CreateWorkOrderDto): Promise<WorkOrder> {
    const actor = requestContext.getStore()?.actor;
    if (!actor) fail(401, 'İşlemi yapan kullanıcı bilgisi eksik');
    const dueAt = new Date(dto.dueAt);
    this.checkDueAt(dueAt);
    return this.orders.manager.transaction(async (manager) => {
      // SERIAL migration sırasında sahipli sequence üretir. Aynı sequence değerini
      // hem id hem kod için kullanırız; MAX(id)+1 gibi yarışa açık hesap yapılmaz.
      const rows = await manager.query<{ value: number }[]>(
        "SELECT nextval(pg_get_serial_sequence('workforce.work_order', 'id'))::int AS value",
      );
      const id = rows[0].value;
      const year = new Date().getUTCFullYear();
      const code = `IE-${year}-${String(id).padStart(5, '0')}`;
      const repository = manager.getRepository(WorkOrder);
      this.checkDueAt(dueAt);
      // Bu TypeORM sürümünde save(), generated ID'yi INSERT'ten çıkarır.
      // Ayırdığımız ID'yi açıkça yaz; default nextval ikinci kez çalışmasın.
      // Bütün kullanıcı verileri parametredir, SQL metnine birleştirilmez.
      const inserted = await manager.query<WorkOrder[]>(
        `INSERT INTO "workforce"."work_order"
           ("id", "code", "title", "description", "priority", "due_at", "created_by_id")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING "id", "code", "title", "description", "priority", "status",
           "team_id" AS "teamId", "due_at" AS "dueAt", "version",
           "created_by_id" AS "createdById", "created_at" AS "createdAt",
           "updated_at" AS "updatedAt"`,
        [
          id,
          code,
          dto.title,
          dto.description ?? null,
          dto.priority ?? WorkOrderPriority.MEDIUM,
          dueAt,
          actor.id,
        ],
      );
      return repository.create(inserted[0]);
    });
  }

  async findOne(id: number): Promise<WorkOrder> {
    const order = await this.orders.findOneBy({ id });
    if (!order) fail(404, 'İş emri bulunamadı');
    return order;
  }

  async update(id: number, dto: UpdateWorkOrderDto): Promise<WorkOrder> {
    return this.orders.manager.transaction(async (manager) => {
      const repository = manager.getRepository(WorkOrder);
      const order = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) fail(404, 'İş emri bulunamadı');
      if (
        order.status === WorkOrderStatus.COMPLETED ||
        order.status === WorkOrderStatus.CANCELLED
      )
        fail(409, 'Kapanmış iş emri güncellenemez');
      if (dto.dueAt !== undefined) {
        const dueAt = new Date(dto.dueAt);
        this.checkDueAt(dueAt);
        order.dueAt = dueAt;
      }
      if (dto.title !== undefined) order.title = dto.title;
      if (dto.description !== undefined) order.description = dto.description;
      if (dto.priority !== undefined) order.priority = dto.priority;
      // status, teamId, code ve createdById bu uçtan değiştirilmez.
      return repository.save(order);
    });
  }

  private checkDueAt(dueAt: Date): void {
    if (!Number.isFinite(dueAt.getTime()) || dueAt.getTime() < Date.now())
      fail(400, 'Son tarih geçerli bir tarih olmalı ve geçmişte olmamalıdır');
  }
}