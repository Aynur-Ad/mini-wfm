import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Team } from '../../teams/entities/team.entity.js';
import { Account } from '../../accounts/entities/account.entity.js';
import { WorkOrderPriority, WorkOrderStatus } from '../work-order.enums.js';

@Entity({ schema: 'workforce', name: 'work_order' })
@Unique('UQ_work_order_code', ['code'])
export class WorkOrder {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_work_order' })
  id: number;
  @Column({ type: 'varchar', length: 20 }) code: string;
  @Column({ type: 'varchar', length: 200 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({
    type: 'enum',
    enum: WorkOrderPriority,
    enumName: 'work_order_priority_enum',
    default: WorkOrderPriority.MEDIUM,
  })
  priority: WorkOrderPriority;
  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    enumName: 'work_order_status_enum',
    default: WorkOrderStatus.OPEN,
  })
  status: WorkOrderStatus;
  @Index('IDX_work_order_team_id')
  @Column({ type: 'int', nullable: true })
  teamId: number | null;
  @ManyToOne(() => Team, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'FK_work_order_team',
  })
  team: Relation<Team> | null;
  @Column({ type: 'timestamptz' }) dueAt: Date;
  @VersionColumn({ type: 'int', default: 1 }) version: number;
  @Column({ type: 'int' }) createdById: number;
  @ManyToOne(() => Account, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'created_by_id',
    foreignKeyConstraintName: 'FK_work_order_created_by',
  })
  createdBy: Relation<Account>;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}