import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { AccountRole } from '../account-role.js';

@Entity({ schema: 'workforce', name: 'account' })
@Unique('UQ_account_username', ['username'])
@Check(
  'CHK_account_username_normalized',
  '"username" = lower(btrim("username")) AND length("username") > 0',
)
export class Account {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_account' })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({ type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: AccountRole, enumName: 'account_role_enum' })
  role: AccountRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}