import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
@Entity({ schema: 'notification', name: 'notification' })
@Unique('UQ_notification_event_recipient', ['eventId', 'workforceUserId'])
@Index('IDX_notification_user_created', ['workforceUserId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'uuid' }) eventId: string;
  @Column({ type: 'varchar', length: 60 }) type: string;
  @Column({ type: 'int' }) workforceUserId: number;
  @Column({ type: 'varchar', length: 200 }) title: string;
  @Column({ type: 'text' }) body: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
