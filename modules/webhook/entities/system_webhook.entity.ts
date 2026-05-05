import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_webhooks')
export class SystemWebhook {
  @PrimaryGeneratedColumn('uuid', { name: 'webhookId' })
  webhookId!: string;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  url!: string;

  // HMAC-SHA256 signing secret — never expose to clients
  @Column({ type: 'varchar' })
  secret!: string;

  // JSON array of subscribed event types
  @Column({ type: 'simple-array' })
  events!: string[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
