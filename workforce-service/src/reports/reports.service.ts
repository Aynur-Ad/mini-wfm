import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DataSource } from 'typeorm';

interface TeamSummaryRow {
  teamId: number;
  teamName: string;
  activeMemberCount: number;
  openCount: number;
  assignedCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  overdueWorkOrderCount: number;
  totalShiftHours: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  async teamSummary(range: { from: string; to: string }) {
    const from = new Date(range.from);
    const to = new Date(range.to);
    const duration = to.getTime() - from.getTime();
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 31 * 86_400_000
    ) {
      throw new RpcException({
        statusCode: 400,
        message:
          'to, from tarihinden sonra olmalı; sorgu aralığı en fazla 31 gün olabilir',
      });
    }

    // Her kaynak join öncesinde ekip başına toplanır; üyeler, emirler ve vardiyalar birbirini çoğaltmaz.
    const rows = await this.dataSource.query<TeamSummaryRow[]>(
      `
      WITH members AS (
        SELECT team_id, COUNT(*)::int AS active_count
        FROM workforce.workforce_user
        WHERE is_active AND team_id IS NOT NULL
        GROUP BY team_id
      ),
      orders AS (
        SELECT team_id,
          (COUNT(*) FILTER (WHERE status = 'OPEN'))::int AS open_count,
          (COUNT(*) FILTER (WHERE status = 'ASSIGNED'))::int AS assigned_count,
          (COUNT(*) FILTER (WHERE status = 'IN_PROGRESS'))::int AS in_progress_count,
          (COUNT(*) FILTER (WHERE status = 'COMPLETED'))::int AS completed_count,
          (COUNT(*) FILTER (WHERE status = 'CANCELLED'))::int AS cancelled_count,
          (COUNT(*) FILTER (
            WHERE due_at < $3 AND status NOT IN ('COMPLETED', 'CANCELLED')
          ))::int AS overdue_count
        FROM workforce.work_order
        WHERE team_id IS NOT NULL
        GROUP BY team_id
      ),
      shift_hours AS (
        SELECT person.team_id,
          (SUM(EXTRACT(EPOCH FROM (
            LEAST(shift.end_at, $2) - GREATEST(shift.start_at, $1)
          ))) / 3600)::double precision AS hours
        FROM workforce.shift AS shift
        JOIN workforce.workforce_user AS person ON person.id = shift.workforce_user_id
        WHERE shift.start_at < $2 AND shift.end_at > $1
          AND person.team_id IS NOT NULL
        GROUP BY person.team_id
      )
      SELECT team.id AS "teamId", team.name AS "teamName",
        COALESCE(members.active_count, 0) AS "activeMemberCount",
        COALESCE(orders.open_count, 0) AS "openCount",
        COALESCE(orders.assigned_count, 0) AS "assignedCount",
        COALESCE(orders.in_progress_count, 0) AS "inProgressCount",
        COALESCE(orders.completed_count, 0) AS "completedCount",
        COALESCE(orders.cancelled_count, 0) AS "cancelledCount",
        COALESCE(orders.overdue_count, 0) AS "overdueWorkOrderCount",
        COALESCE(shift_hours.hours, 0) AS "totalShiftHours"
      FROM workforce.team AS team
      LEFT JOIN members ON members.team_id = team.id
      LEFT JOIN orders ON orders.team_id = team.id
      LEFT JOIN shift_hours ON shift_hours.team_id = team.id
      ORDER BY team.id
      `,
      [from, to, new Date(Date.now())],
    );

    return rows.map((row) => ({
      teamId: row.teamId,
      teamName: row.teamName,
      activeMemberCount: row.activeMemberCount,
      workOrderCounts: {
        OPEN: row.openCount,
        ASSIGNED: row.assignedCount,
        IN_PROGRESS: row.inProgressCount,
        COMPLETED: row.completedCount,
        CANCELLED: row.cancelledCount,
      },
      overdueWorkOrderCount: row.overdueWorkOrderCount,
      totalShiftHours: row.totalShiftHours,
    }));
  }
}
