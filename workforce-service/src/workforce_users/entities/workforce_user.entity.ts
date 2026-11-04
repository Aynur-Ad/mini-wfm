import {
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
import { Team } from '../../teams/entities/team.entity.js';

@Entity({ schema: 'workforce', name: 'workforce_user' })
export class WorkforceUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  registrationNumber: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  phone: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Index('IDX_workforce_user_team_id')
  @Column({ name: 'team_id', type: 'int', nullable: true })
  teamId: number | null;

  @ManyToOne(() => Team, (team) => team.members, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'FK_workforce_user_team',
  })
  team: Relation<Team> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}