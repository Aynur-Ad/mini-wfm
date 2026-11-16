import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { In, LessThan, MoreThan } from 'typeorm';
import type { Repository } from 'typeorm';
import { WorkOrder } from './entities/work-order.entity.js';
import { Team } from '../teams/entities/team.entity.js';
import { Shift } from '../shifts/entities/shift.entity.js';
import { WorkOrderStatus } from './work-order.enums.js';
import { scoreTeams } from './calc/team-score.js';
@Injectable()
export class TeamSuggestionsService {
  constructor(
    @InjectRepository(WorkOrder) private readonly orders: Repository<WorkOrder>,
  ) {}
  async suggest(id: number) {
    // Toplam en fazla dört SELECT: hedef, ekip+aktif üyeler, vardiyalar, açık iş emirleri.
    const order = await this.orders.findOneBy({ id });
    if (!order)
      throw new RpcException({
        statusCode: 404,
        message: 'İş emri bulunamadı',
      });
    if (order.status !== WorkOrderStatus.OPEN)
      throw new RpcException({
        statusCode: 409,
        message: 'Yalnız açık iş emri için ekip önerilebilir',
      });
    const now = new Date();
    const teams = await this.orders.manager
      .getRepository(Team)
      .createQueryBuilder('team')
      .leftJoinAndSelect(
        'team.members',
        'member',
        'member.isActive = :active',
        { active: true },
      )
      .select([
        'team.id',
        'team.name',
        'team.isActive',
        'member.id',
        'member.teamId',
        'member.isActive',
      ])
      .where('team.isActive = :active', { active: true })
      .getMany();
    const members = teams.flatMap((team) => team.members);
    const ids = members.map((member) => member.id);
    const shifts = ids.length
      ? await this.orders.manager
          .getRepository(Shift)
          .find({
            select: { workforceUserId: true, startAt: true, endAt: true },
            where: {
              workforceUserId: In(ids),
              startAt: LessThan(order.dueAt),
              endAt: MoreThan(now),
            },
          })
      : [];
    const workload = teams.length
      ? await this.orders.find({
          select: { id: true, teamId: true, status: true, dueAt: true },
          where: {
            teamId: In(teams.map((team) => team.id)),
            status: In([WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS]),
          },
        })
      : [];
    return scoreTeams(order, teams, members, shifts, workload, now);
  }
}
