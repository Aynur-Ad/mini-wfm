import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { WorkforceUser } from '../../workforce_users/entities/workforce_user.entity.js';
import { Account } from '../../accounts/entities/account.entity.js';

@Entity({ schema: 'workforce', name: 'shift' })
@Check(
  'CHK_shift_duration',
  '"end_at" >= "start_at" + interval \'1 hour\' AND "end_at" <= "start_at" + interval \'12 hours\'',
)
@Index('IDX_shift_start_at', ['startAt'])
@Index('IDX_shift_person_start_at', ['workforceUserId', 'startAt'])
export class Shift {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_shift' })
  id: number;

  @Column({ type: 'int' })
  workforceUserId: number;

  @ManyToOne(() => WorkforceUser, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'workforce_user_id',
    foreignKeyConstraintName: 'FK_shift_workforce_user',
  })
  workforceUser: Relation<WorkforceUser>;

  @Column({ type: 'timestamptz' })
  startAt: Date;

  @Column({ type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ type: 'int' })
  createdById: number;

  @ManyToOne(() => Account, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'created_by_id',
    foreignKeyConstraintName: 'FK_shift_created_by',
  })
  createdBy: Relation<Account>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}