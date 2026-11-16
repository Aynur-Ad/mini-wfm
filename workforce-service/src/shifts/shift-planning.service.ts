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