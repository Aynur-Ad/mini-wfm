import { WORK_RULE_OPTIONS } from '../config/work-rules.config.js';
import { checkWorkRules } from './calc/work-rules.js';
import type {
  WorkRulesOptions,
  WorkRuleViolation,
  RuleShift,
} from './calc/work-rules.js';
import type { CreateTeamShiftsDto } from './dto/create-team-shifts.dto.js';
import { Team } from '../teams/entities/team.entity.js';
import type { ShiftListItem } from './dto/shift-list-item.dto.js';
import type { QueryShiftsDto } from './dto/query-shifts.dto.js';
import { Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThan, Not } from 'typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { Shift } from './entities/shift.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { requestContext } from '../common/logging/request-context.js';
import type { CreateShiftDto } from './dto/create-shift.dto.js';
import type { UpdateShiftDto } from './dto/update-shift.dto.js';
import { validShiftDuration } from './calc/shift-interval.js';

function fail(statusCode: number, message: string): never {
  throw new RpcException({ statusCode, message });
}

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift) private readonly shifts: Repository<Shift>,
    @Inject(WORK_RULE_OPTIONS) private readonly ruleOptions: WorkRulesOptions,
  ) {}

  async create(dto: CreateShiftDto): Promise<Shift> {
    const actor = requestContext.getStore()?.actor;
    if (!actor) fail(401, 'İşlemi yapan kullanıcı bilgisi eksik');
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.checkInterval(startAt, endAt);
    return this.shifts.manager.transaction(async (manager) => {
      await this.lockPeople(
        manager,
        [dto.workforceUserId],
        dto.workforceUserId,
      );
      this.checkFuture(startAt);
      const repository = manager.getRepository(Shift);
      await this.checkOverlap(repository, dto.workforceUserId, startAt, endAt);
      this.rejectWorkRules(
        await this.workRuleViolations(repository, [
          { workforceUserId: dto.workforceUserId, startAt, endAt },
        ]),
      );
      return repository.save(
        repository.create({
          workforceUserId: dto.workforceUserId,
          startAt,
          endAt,
          note: dto.note ?? null,
          createdById: actor.id,
        }),
      );
    });
  }

  async createForTeam(
    teamId: number,
    dto: CreateTeamShiftsDto,
  ): Promise<Shift[]> {
    const actor = requestContext.getStore()?.actor;
    if (!actor) fail(401, 'İşlemi yapan kullanıcı bilgisi eksik');
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.checkInterval(startAt, endAt);
    return this.shifts.manager.transaction(async (manager) => {
      // Üyelik işlemleri de önce ekip, sonra personel kilitler. Atama sırasında
      // üyelik değişmesin; tekil vardiya işlemleriyle de aynı personel kilidi kullanılsın.
      const team = await manager.getRepository(Team).findOne({
        where: { id: teamId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!team) fail(404, 'Ekip bulunamadı');
      if (!team.isActive) fail(409, 'Pasif ekibe vardiya atanamaz');
      const members = await manager
        .getRepository(WorkforceUser)
        .createQueryBuilder('person')
        .select([
          'person.id',
          'person.registrationNumber',
          'person.firstName',
          'person.lastName',
        ])
        .where('person.teamId = :teamId', { teamId })
        .andWhere('person.isActive = :isActive', { isActive: true })
        .orderBy('person.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();
      if (members.length === 0) fail(409, 'Ekibin aktif üyesi bulunmuyor');
      // Kilit beklenirken başlangıç geçmiş olabilir; yazmadan önce yeniden bakılır.
      this.checkFuture(startAt);
      const repository = manager.getRepository(Shift);
      const conflicts = await repository.find({
        select: { workforceUserId: true },
        where: {
          workforceUserId: In(members.map((member) => member.id)),
          startAt: LessThan(endAt),
          endAt: MoreThan(startAt),
        },
      });
      if (conflicts.length > 0) {
        const conflictingIds = new Set(
          conflicts.map((shift) => shift.workforceUserId),
        );
        const details = members
          .filter((member) => conflictingIds.has(member.id))
          .map((member) => ({
            workforceUserId: member.id,
            registrationNumber: member.registrationNumber,
            firstName: member.firstName,
            lastName: member.lastName,
          }));
        throw new RpcException({
          statusCode: 409,
          message: 'Ekip üyelerinin mevcut vardiyalarıyla çakışma var',
          details,
        });
      }
      const violations = await this.workRuleViolations(
        repository,
        members.map((member) => ({
          workforceUserId: member.id,
          startAt,
          endAt,
        })),
      );
      const byId = new Map(members.map((member) => [member.id, member]));
      this.rejectWorkRules(violations, byId);
      // Üye başına create() çağırmak ayrı transaction'lar açardı. Tüm kontrol ve
      // kayıtlar aynı manager/repository ve tek transaction içinde tutulur.
      const shifts = members.map((member) =>
        repository.create({
          workforceUserId: member.id,
          startAt,
          endAt,
          note: dto.note ?? null,
          createdById: actor.id,
        }),
      );
      return repository.save(shifts);
    });
  }

  async findAll(query: QueryShiftsDto): Promise<ShiftListItem[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const duration = to.getTime() - from.getTime();
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 31 * 24 * 60 * 60 * 1000
    ) {
      fail(
        400,
        'to, from tarihinden sonra olmalı; sorgu aralığı en fazla 31 gün olabilir',
      );
    }
    for (const id of [query.workforceUserId, query.teamId]) {
      if (id !== undefined && (!Number.isInteger(id) || id < 1))
        fail(400, 'Filtre ID değerleri pozitif tam sayı olmalıdır');
    }
    // Tek sorgu: personel ve ekip alanları join ile gelir; N+1 sorgusu yoktur.
    const builder = this.shifts
      .createQueryBuilder('shift')
      .innerJoinAndSelect('shift.workforceUser', 'person')
      .leftJoinAndSelect('person.team', 'team')
      .select([
        'shift.id',
        'shift.workforceUserId',
        'shift.startAt',
        'shift.endAt',
        'shift.note',
        'shift.createdById',
        'shift.createdAt',
        'shift.updatedAt',
        'person.id',
        'person.firstName',
        'person.lastName',
        'team.id',
        'team.name',
      ])
      // [from, to): sınırda yalnızca dokunan değil, gerçekten kesişen aralıklar.
      .where('shift.startAt < :to', { to })
      .andWhere('shift.endAt > :from', { from })
      .orderBy('shift.startAt', 'ASC')
      .addOrderBy('shift.id', 'ASC');
    if (query.workforceUserId !== undefined)
      builder.andWhere('shift.workforceUserId = :workforceUserId', {
        workforceUserId: query.workforceUserId,
      });
    // Ekip geçmişi yoktur; filtre ve gösterilen ekip personelin güncel ekibidir.
    if (query.teamId !== undefined)
      builder.andWhere('person.teamId = :teamId', { teamId: query.teamId });
    const rows = await builder.getMany();
    return rows.map((row) => ({
      id: row.id,
      workforceUserId: row.workforceUserId,
      startAt: row.startAt,
      endAt: row.endAt,
      note: row.note,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      workforceUser: {
        id: row.workforceUser.id,
        firstName: row.workforceUser.firstName,
        lastName: row.workforceUser.lastName,
        team: row.workforceUser.team
          ? { id: row.workforceUser.team.id, name: row.workforceUser.team.name }
          : null,
      },
    }));
  }

  async findOne(id: number): Promise<Shift> {
    const shift = await this.shifts.findOneBy({ id });
    if (!shift) fail(404, 'Vardiya bulunamadı');
    return shift;
  }

  async update(id: number, dto: UpdateShiftDto): Promise<Shift> {
    return this.shifts.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Shift);
      const initial = await repository.findOneBy({ id });
      if (!initial) fail(404, 'Vardiya bulunamadı');
      const targetId = dto.workforceUserId ?? initial.workforceUserId;
      // Aynı personele ait bütün vardiya yazmaları personel satırında sıralanır.
      // Personel değişiyorsa iki satır da sabit sırada kilitlenir.
      await this.lockPeople(
        manager,
        [initial.workforceUserId, targetId],
        targetId,
      );
      const shift = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!shift) fail(404, 'Vardiya bulunamadı');
      if (shift.workforceUserId !== initial.workforceUserId) {
        fail(409, 'Vardiya başka bir istekte değiştirildi; tekrar deneyin');
      }
      this.checkFuture(shift.startAt);
      const startAt =
        dto.startAt === undefined ? shift.startAt : new Date(dto.startAt);
      const endAt = dto.endAt === undefined ? shift.endAt : new Date(dto.endAt);
      this.checkInterval(startAt, endAt);
      this.checkFuture(startAt);
      await this.checkOverlap(repository, targetId, startAt, endAt, id);
      this.rejectWorkRules(
        await this.workRuleViolations(
          repository,
          [{ id, workforceUserId: targetId, startAt, endAt }],
          id,
        ),
      );
      // createdById yalnızca create sırasında actor'dan gelir; güncellemede korunur.
      shift.workforceUserId = targetId;
      shift.startAt = startAt;
      shift.endAt = endAt;
      if (dto.note !== undefined) shift.note = dto.note;
      return repository.save(shift);
    });
  }

  async remove(id: number): Promise<{ deleted: boolean; id: number }> {
    return this.shifts.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Shift);
      const initial = await repository.findOneBy({ id });
      if (!initial) fail(404, 'Vardiya bulunamadı');
      await this.lockPeople(
        manager,
        [initial.workforceUserId],
        initial.workforceUserId,
      );
      const shift = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!shift) fail(404, 'Vardiya bulunamadı');
      if (shift.workforceUserId !== initial.workforceUserId)
        fail(409, 'Vardiya başka bir istekte değiştirildi; tekrar deneyin');
      this.checkFuture(shift.startAt);
      await repository.remove(shift);
      return { deleted: true, id };
    });
  }

  private async workRuleViolations(
    repository: Repository<Shift>,
    added: RuleShift[],
    excludedId?: number,
  ): Promise<WorkRuleViolation[]> {
    // Tek sorgu, tüm aday personeller. Eski PATCH kaydı DB sorgusunda dışlanır.
    const margin = 7 * 24 * 60 * 60_000;
    const from = new Date(
      Math.min(...added.map((shift) => shift.startAt.getTime())) - margin,
    );
    const to = new Date(
      Math.max(...added.map((shift) => shift.endAt.getTime())) + margin,
    );
    const existing = await repository.find({
      select: { id: true, workforceUserId: true, startAt: true, endAt: true },
      where: {
        workforceUserId: In([
          ...new Set(added.map((shift) => shift.workforceUserId)),
        ]),
        startAt: LessThan(to),
        endAt: MoreThan(from),
        ...(excludedId === undefined ? {} : { id: Not(excludedId) }),
      },
      order: { startAt: 'ASC', id: 'ASC' },
    });
    return checkWorkRules(existing, added, this.ruleOptions);
  }

  private rejectWorkRules(
    violations: WorkRuleViolation[],
    members?: ReadonlyMap<
      number,
      { registrationNumber: string; firstName: string; lastName: string }
    >,
  ): void {
    if (violations.length === 0) return;
    // P10: dakika hesabı biter; saat dönüşümü/1 ondalık yalnız yanıt sınırındadır.
    const details = violations.map((violation) => {
      const hours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;
      const value =
        violation.unit === 'minutes' ? hours(violation.value) : violation.value;
      const limit =
        violation.unit === 'minutes' ? hours(violation.limit) : violation.limit;
      const messages = {
        REST: `Dinlenme süresi ${value} saat${violation.value < violation.limit && value >= limit ? ' (sınırın altında)' : ''}; en az ${limit} saat olmalıdır`,
        WEEKLY_LIMIT: `Haftalık çalışma ${value} saat${violation.value > violation.limit && value <= limit ? ' (sınırın üstünde)' : ''}; en fazla ${limit} saat olabilir`,
        CONSECUTIVE_DAYS: `Ardışık çalışma ${value} gün; en fazla ${limit} gün olabilir`,
      };
      const member = members?.get(violation.workforceUserId);
      return {
        ...violation,
        ...(violation.unit === 'minutes'
          ? { actualMinutes: violation.value, limitMinutes: violation.limit }
          : {}),
        value,
        limit,
        unit: violation.unit === 'minutes' ? 'hours' : 'days',
        message: messages[violation.code],
        ...(member
          ? {
              registrationNumber: member.registrationNumber,
              firstName: member.firstName,
              lastName: member.lastName,
            }
          : {}),
      };
    });
    throw new RpcException({
      statusCode: 409,
      message: 'Vardiya çalışma kurallarına uymuyor',
      details,
    });
  }

  private checkInterval(startAt: Date, endAt: Date): void {
    if (!validShiftDuration(startAt, endAt))
      fail(
        400,
        'Bitiş başlangıçtan sonra olmalı; vardiya en az 1, en fazla 12 saat sürmelidir',
      );
  }

  private checkFuture(startAt: Date): void {
    if (startAt.getTime() < Date.now())
      fail(
        409,
        'Geçmişe vardiya eklenemez; başlamış vardiya değiştirilemez veya silinemez',
      );
  }

  private async lockPeople(
    manager: EntityManager,
    ids: number[],
    targetId: number,
  ): Promise<void> {
    for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
      const person = await manager
        .getRepository(WorkforceUser)
        .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!person) fail(404, 'Personel bulunamadı');
      if (id === targetId && !person.isActive)
        fail(409, 'Pasif personele ait vardiya işlemi yapılamaz');
    }
  }

  private async checkOverlap(
    repository: Repository<Shift>,
    workforceUserId: number,
    startAt: Date,
    endAt: Date,
    excludedId?: number,
  ): Promise<void> {
    // start < yeniEnd AND end > yeniStart; eşit sınırlar çakışma değildir.
    const conflict = await repository.findOne({
      where: {
        workforceUserId,
        startAt: LessThan(endAt),
        endAt: MoreThan(startAt),
        ...(excludedId === undefined ? {} : { id: Not(excludedId) }),
      },
      order: { startAt: 'ASC', id: 'ASC' },
    });
    if (conflict)
      fail(
        409,
        `Vardiya çakışması: ${conflict.startAt.toISOString()} – ${conflict.endAt.toISOString()}`,
      );
  }
}