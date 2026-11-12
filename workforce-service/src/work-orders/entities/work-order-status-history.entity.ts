import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { WorkOrder } from './work-order.entity.js';
import { Team } from '../../teams/entities/team.entity.js';
import { Account } from '../../accounts/entities/account.entity.js';
import { WorkOrderStatus } from '../work-order.enums.js';
@Entity({ schema: 'workforce', name: 'work_order_status_history' })
@Index('IDX_work_order_status_history_order_time', ['workOrderId', 'changedAt'])
export class WorkOrderStatusHistory {
  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_work_order_status_history',
  })
  id: number;
  @Column({ type: 'int' }) workOrderId: number;
  @ManyToOne(() => WorkOrder, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'work_order_id',
    foreignKeyConstraintName: 'FK_work_order_history_order',
  })
  workOrder: Relation<WorkOrder>;
  // Geçmiş metin olarak tutulur; ortak enum tipinin yaşam döngüsüne bağlanmaz.
  @Column({ type: 'varchar', length: 20, nullable: true })
  fromStatus: WorkOrderStatus | null;
  @Column({ type: 'varchar', length: 20 }) toStatus: WorkOrderStatus;
  @Column({ type: 'int', nullable: true }) teamId: number | null;
  @ManyToOne(() => Team, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'FK_work_order_history_team',
  })
  team: Relation<Team> | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) reason:
    string | null;
  @Column({ type: 'int' }) changedById: number;
  @ManyToOne(() => Account, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'changed_by_id',
    foreignKeyConstraintName: 'FK_work_order_history_account',
  })
  changedBy: Relation<Account>;
  @CreateDateColumn({ type: 'timestamptz' }) changedAt: Date;
}