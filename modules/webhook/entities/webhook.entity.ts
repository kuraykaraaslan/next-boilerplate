import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid', { name: 'webhookId' })
  webhookId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

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

  // Previous secret kept valid during a rotation window so receivers have time
  // to swap. Cleared once `previousSecretExpiresAt` passes. Outgoing requests
  // carry both `X-Webhook-Signature` and (when set) `X-Webhook-Signature-Prev`.
  @Column({ type: 'varchar', nullable: true })
  previousSecret!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  previousSecretExpiresAt!: Date | null;

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
