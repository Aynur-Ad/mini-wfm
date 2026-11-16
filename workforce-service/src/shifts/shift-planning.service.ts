import { Team } from '../teams/entities/team.entity.js';
import { In } from 'typeorm';
import { requestContext } from '../common/logging/request-context.js';
import { buildRotationPlan, rotationRange } from './calc/rotation.js';
import type { RotationRequest } from './calc/rotation.js';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { LessThan, MoreThan } from 'typeorm';
import type { Repository } from 'typeorm';
import { Shift } from './entities/shift.entity.js';
import { WorkforceUser } from '../workforce_users/entities/workforce_user.entity.js';
import { WORK_RULE_OPTIONS } from '../config/work-rules.config.js';
import type { WorkRulesOptions } from './calc/work-rules.js';
import {
  calculateTimesheet,
  monthRange,
  timesheetHours,
} from './calc/timesheet.js';
@Injectable()
export class ShiftPlanningService {
  constructor(
    @InjectRepository(Shift) private readonly shifts: Repository<Shift>,
    @Inject(WORK_RULE_OPTIONS) private readonly options: WorkRulesOptions,
  ) {}
  async rotation(teamId: number, request: RotationRequest) {
    let range: ReturnType<typeof rotationRange>;
    try {
      range = rotationRange(request, this.options);
    } catch (error) {
      throw new RpcException({
        statusCode: 400,
        message: error instanceof Error ? error.message : 'Geçersiz plan',
      });
    }
    const actor = requestContext.getStore()?.actor;
    if (request.apply && !actor)
      throw new RpcException({
        statusCode: 401,
        message: 'İşlemi yapan kullanıcı bilgisi eksik',
      });
    return this.shifts.manager.transaction(async (manager) => {
      const team = await manager
        .getRepository(Team)
        .findOne({
          where: { id: teamId },
          ...(request.apply
            ? { lock: { mode: 'pessimistic_write' as const } }
            : {}),
        });
      if (!team)
        throw new RpcException({ statusCode: 404, message: 'Ekip bulunamadı' });
      if (!team.isActive)
        throw new RpcException({
          statusCode: 409,
          message: 'Pasif ekibe plan yapılamaz',
        });
      const query = manager
        .getRepository(WorkforceUser)
        .createQueryBuilder('person')
        .where('person.teamId = :teamId', { teamId })
        .andWhere('person.isActive = :active', { active: true })
        .orderBy('person.id', 'ASC');
      if (request.apply) query.setLock('pessimistic_write');
      const members = await query.getMany();
      const repository = manager.getRepository(Shift);
      const existing = members.length
        ? await repository.find({
            where: {
              workforceUserId: In(members.map((m) => m.id)),
              startAt: LessThan(new Date(range.end + 7 * 86400000)),
              endAt: MoreThan(new Date(range.start - 7 * 86400000)),
            },
          })
        : [];
      const plan = buildRotationPlan(members, existing, request, this.options);
      if (request.apply) {
        if (plan.unfilled.length)
          throw new RpcException({
            statusCode: 409,
            message: 'Plan tamamlanamadı',
            details: plan.unfilled,
          });
        if (plan.assignments.some((a) => Date.parse(a.startAt) < Date.now()))
          throw new RpcException({
            statusCode: 409,
            message: 'Geçmişe vardiya eklenemez',
          });
        await repository.save(
          plan.assignments.map((a) =>
            repository.create({
              workforceUserId: a.workforceUserId,
              startAt: new Date(a.startAt),
              endAt: new Date(a.endAt),
              note: a.slot,
              createdById: actor!.id,
            }),
          ),
        );
      }
      return { ...plan, applied: request.apply === true };
    });
  }

  async timesheet(id: number, month: string) {
    let range: ReturnType<typeof monthRange>;
    try {
      range = monthRange(month, this.options.timezoneOffsetMinutes);
    } catch {
      throw new RpcException({
        statusCode: 400,
        message: 'Ay 2026 veya 2027 için YYYY-MM biçiminde olmalıdır',
      });
    }
    if (
      !(await this.shifts.manager.getRepository(WorkforceUser).existsBy({ id }))
    )
      throw new RpcException({
        statusCode: 404,
        message: 'Personel bulunamadı',
      });
    const rows = await this.shifts.find({
      where: {
        workforceUserId: id,
        startAt: LessThan(new Date(range.to)),
        endAt: MoreThan(new Date(range.from)),
      },
      order: { startAt: 'ASC', id: 'ASC' },
    });
    return timesheetHours(calculateTimesheet(rows, month, this.options));
  }
}