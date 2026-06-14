import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type NotificationChannel = 'mail' | 'sms' | 'push' | 'inapp';
export type NotificationStatus = 'sent' | 'failed' | 'pending';

/**
 * Unified outbound notification audit row.
 *
 * One row per delivery attempt across all channels (mail, sms, push, inapp).
 * Written by:
 *   - notification_mail worker on completed/failed
 *   - notification_sms worker on completed/failed
 *   - notification_push (future)
 *   - notification_inapp (future)
 */
@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid', { name: 'notificationLogId' })
  notificationLogId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'varchar' })
  channel!: NotificationChannel;

  @Index()
  @Column({ type: 'varchar' })
  recipient!: string; // email / phone / userId

  @Column({ nullable: true, type: 'varchar' })
  subject?: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @Index()
  @Column({ type: 'varchar' })
  status!: NotificationStatus;

  @Column({ nullable: true, type: 'varchar' })
  providerMessageId?: string;

  @Column({ nullable: true, type: 'text' })
  error?: string;

  // Delivery attempt count (retries before final status).
  @Column({ type: 'int', default: 1 })
  attempts!: number;

  // Template / event type that triggered this notification.
  @Index()
  @Column({ nullable: true, type: 'varchar' })
  eventType?: string;

  // ISO country of the recipient (analytics / deliverability by region).
  @Index()
  @Column({ nullable: true, type: 'varchar', length: 2 })
  recipientCountry?: string;

  // End-to-end delivery latency in milliseconds (enqueue -> provider ack).
  @Column({ nullable: true, type: 'int' })
  latencyMs?: number;

  @CreateDateColumn({ type: 'timestamp' })
  sentAt!: Date;
}
