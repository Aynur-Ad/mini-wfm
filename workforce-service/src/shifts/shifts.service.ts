import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Not } from 'typeorm';
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