import type { QueryWorkOrdersDto } from './dto/query-work-orders.dto.js';
import { WorkOrderStatusHistory } from './entities/work-order-status-history.entity.js';
import {
  STATUS_TRANSITIONS,
  STATUS_LABELS,
} from './rules/status-transitions.js';
import type { ChangeWorkOrderStatusDto } from './dto/change-work-order-status.dto.js';
import { Team } from '../teams/entities/team.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
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
      const order = repository.create(inserted[0]);
      const history = manager.getRepository(WorkOrderStatusHistory);
      await history.save(
        history.create({
          workOrderId: order.id,
          fromStatus: null,
          toStatus: WorkOrderStatus.OPEN,
          teamId: null,
          reason: null,
          changedById: actor.id,
        }),
      );
      return order;
    });
  }

  async findAll(dto: QueryWorkOrdersDto = {}) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const sortBy = dto.sortBy ?? 'createdAt';
    const sortOrder = dto.sortOrder ?? 'desc';
    // Alan ve yön yalnız sabit beyaz listeden seçilir; istemci SQL üretemez.
    const sortColumns = {
      createdAt: 'wo.createdAt',
      dueAt: 'wo.dueAt',
      priority: 'priority_rank',
    };
    if (
      !Object.hasOwn(sortColumns, sortBy) ||
      !['asc', 'desc'].includes(sortOrder)
    )
      fail(400, 'Geçersiz sıralama alanı veya yönü');
    const now = new Date();
    const closed = [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED];
    // Aynı referans anı hem filtrede hem hesaplanan alanda kullanılır.
    const overdueSql = '(wo.dueAt < :now AND wo.status NOT IN (:...closed))';
    const query = this.orders
      .createQueryBuilder('wo')
      .leftJoin('wo.team', 'team')
      .select('wo.id', 'id')
      .addSelect('wo.code', 'code')
      .addSelect('wo.title', 'title')
      .addSelect('wo.description', 'description')
      .addSelect('wo.priority', 'priority')
      .addSelect('wo.status', 'status')
      .addSelect('wo.teamId', 'teamId')
      .addSelect('wo.dueAt', 'dueAt')
      .addSelect('wo.version', 'version')
      .addSelect('wo.createdById', 'createdById')
      .addSelect('wo.createdAt', 'createdAt')
      .addSelect('wo.updatedAt', 'updatedAt')
      .addSelect('team.id', 'joinedTeamId')
      .addSelect('team.name', 'teamName')
      .addSelect(overdueSql, 'isOverdue')
      .addSelect(
        "CASE wo.priority WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 WHEN 'URGENT' THEN 4 END",
        'priority_rank',
      )
      .setParameters({ now, closed });
    const search = dto.search?.trim();
    if (search) {
      // LIKE jokerleri arama metninde gerçek karakter olarak ele alınır.
      const escaped = search.replace(
        /[\\%_]/g,
        (character) => `\\${character}`,
      );
      query.andWhere('(wo.code ILIKE :search OR wo.title ILIKE :search)', {
        search: `%${escaped}%`,
      });
    }
    if (dto.status?.length)
      query.andWhere('wo.status IN (:...statuses)', { statuses: dto.status });
    if (dto.priority !== undefined)
      query.andWhere('wo.priority = :priority', { priority: dto.priority });
    if (dto.teamId !== undefined)
      query.andWhere('wo.teamId = :teamId', { teamId: dto.teamId });
    if (dto.overdue === true) query.andWhere(overdueSql);
    // total, sayfa sınırından önceki filtrelenmiş kayıt sayısıdır.
    const total = await query.clone().getCount();
    const rows = await query
      .orderBy(sortColumns[sortBy], sortOrder === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('wo.id', sortOrder === 'asc' ? 'ASC' : 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<{
        id: number;
        code: string;
        title: string;
        description: string | null;
        priority: WorkOrderPriority;
        status: WorkOrderStatus;
        teamId: number | null;
        dueAt: Date;
        version: number;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
        joinedTeamId: number | null;
        teamName: string | null;
        isOverdue: boolean;
        priority_rank: number;
      }>();
    return {
      data: rows.map(
        ({ joinedTeamId, teamName, priority_rank: _rank, ...order }) => ({
          ...order,
          team:
            joinedTeamId === null
              ? null
              : { id: joinedTeamId, name: teamName! },
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<WorkOrder> {
    const order = await this.orders.findOneBy({ id });
    if (!order) fail(404, 'İş emri bulunamadı');
    return order;
  }

  async update(id: number, dto: UpdateWorkOrderDto): Promise<WorkOrder> {
    return this.orders.manager.transaction(async (manager) => {
      const repository = manager.getRepository(WorkOrder);
      const order = await repository.findOne({ where: { id } });
      if (!order) fail(404, 'İş emri bulunamadı');
      this.checkVersion(order.version, dto.version);
      if (
        order.status === WorkOrderStatus.COMPLETED ||
        order.status === WorkOrderStatus.CANCELLED
      )
        fail(409, 'Kapanmış iş emri güncellenemez');
      const changes: Partial<
        Pick<WorkOrder, 'title' | 'description' | 'priority' | 'dueAt'>
      > = {};
      if (dto.dueAt !== undefined) {
        const dueAt = new Date(dto.dueAt);
        this.checkDueAt(dueAt);
        changes.dueAt = dueAt;
      }
      if (dto.title !== undefined) changes.title = dto.title;
      if (dto.description !== undefined) changes.description = dto.description;
      if (dto.priority !== undefined) changes.priority = dto.priority;
      // Durum/ekip/kod/oluşturan alanları buradan değişmez. version yalnız koşuldur.
      return this.updateIfVersionMatches(repository, id, dto.version, changes);
    });
  }

  async changeStatus(
    id: number,
    dto: ChangeWorkOrderStatusDto,
  ): Promise<WorkOrder> {
    const actor = requestContext.getStore()?.actor;
    if (!actor) fail(401, 'İşlemi yapan kullanıcı bilgisi eksik');
    return this.orders.manager.transaction(async (manager) => {
      const repository = manager.getRepository(WorkOrder);
      const order = await repository.findOne({ where: { id } });
      if (!order) fail(404, 'İş emri bulunamadı');
      this.checkVersion(order.version, dto.version);
      // API'deki dinamik rol kontrolü ile mutation arasındaki yarış kapatılır.
      if (order.status !== dto.expectedStatus) this.versionConflict();
      const rule = STATUS_TRANSITIONS[order.status]?.[dto.status];
      if (!rule)
        fail(
          409,
          `İş emri ${STATUS_LABELS[order.status]} durumundan ${STATUS_LABELS[dto.status] ?? dto.status} durumuna alınamaz`,
        );
      const reason = dto.reason?.trim() || null;
      if (rule.reasonRequired && !reason) fail(400, 'İptal nedeni zorunludur');
      if (reason && Array.from(reason).length > 500)
        fail(400, 'Neden en fazla 500 karakter olabilir');
      let teamId = order.teamId;
      if (rule.teamAction === 'assign') {
        if (!Number.isInteger(dto.teamId) || !dto.teamId || dto.teamId < 1)
          fail(400, 'Atamada geçerli ekip ID zorunludur');
        const team = await manager.getRepository(Team).findOne({
          where: { id: dto.teamId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!team) fail(404, 'Ekip bulunamadı');
        if (!team.isActive) fail(409, 'Pasif ekibe iş emri atanamaz');
        const active = await manager
          .getRepository(WorkforceUser)
          .createQueryBuilder('person')
          .select(['person.id'])
          .where('person.teamId = :teamId', { teamId: team.id })
          .andWhere('person.isActive = :isActive', { isActive: true })
          .orderBy('person.id', 'ASC')
          .setLock('pessimistic_read')
          .getMany();
        if (active.length === 0) fail(409, 'Ekibin aktif üyesi bulunmuyor');
        teamId = team.id;
      } else if (rule.teamAction === 'clear') teamId = null;
      const fromStatus = order.status;
      const saved = await this.updateIfVersionMatches(
        repository,
        id,
        dto.version,
        { status: dto.status, teamId },
        dto.expectedStatus,
      );
      const history = manager.getRepository(WorkOrderStatusHistory);
      await history.save(
        history.create({
          workOrderId: id,
          fromStatus,
          toStatus: saved.status,
          teamId: saved.teamId,
          reason,
          changedById: actor.id,
        }),
      );
      return saved;
    });
  }

  async findHistory(id: number) {
    await this.findOne(id);
    const rows = await this.orders.manager
      .getRepository(WorkOrderStatusHistory)
      .createQueryBuilder('history')
      .innerJoinAndSelect('history.changedBy', 'account')
      .select([
        'history.id',
        'history.workOrderId',
        'history.fromStatus',
        'history.toStatus',
        'history.teamId',
        'history.reason',
        'history.changedById',
        'history.changedAt',
        'account.id',
        'account.username',
      ])
      .where('history.workOrderId = :id', { id })
      .orderBy('history.changedAt', 'ASC')
      .addOrderBy('history.id', 'ASC')
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      workOrderId: row.workOrderId,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      teamId: row.teamId,
      reason: row.reason,
      changedById: row.changedById,
      changedAt: row.changedAt,
      changedBy: { id: row.changedBy.id, username: row.changedBy.username },
    }));
  }

  private versionConflict(): never {
    fail(409, 'Kayıt siz düzenlerken değişti, sayfayı yenileyin');
  }

  private checkVersion(current: number, requested: number): void {
    if (current !== requested) this.versionConflict();
  }

  private async updateIfVersionMatches(
    repository: Repository<WorkOrder>,
    id: number,
    version: number,
    changes: Partial<
      Pick<
        WorkOrder,
        'title' | 'description' | 'priority' | 'dueAt' | 'status' | 'teamId'
      >
    >,
    expectedStatus?: WorkOrderStatus,
  ): Promise<WorkOrder> {
    // Okuma anındaki kontrol tek başına yeterli değildir. PostgreSQL, bekleyen
    // UPDATE'in WHERE koşulunu satırın güncel sürümü üzerinde tekrar değerlendirir.
    // Sürümü aynı SQL'de bir artırırız; save() ile ikinci güncelleme yapılmaz.
    const query = repository
      .createQueryBuilder()
      .update(WorkOrder)
      .set({
        ...changes,
        version: () => '"version" + 1',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('"id" = :id', { id })
      .andWhere('"version" = :version', { version });
    if (expectedStatus !== undefined)
      query.andWhere('"status" = :expectedStatus', { expectedStatus });
    const result = await query.execute();
    if (result.affected !== 1) this.versionConflict();
    // Transaction bitene kadar UPDATE satır kilidini tutar; kendi yeni sürümümüz okunur.
    return repository.findOneByOrFail({ id });
  }

  private checkDueAt(dueAt: Date): void {
    if (!Number.isFinite(dueAt.getTime()) || dueAt.getTime() < Date.now())
      fail(400, 'Son tarih geçerli bir tarih olmalı ve geçmişte olmamalıdır');
  }
}