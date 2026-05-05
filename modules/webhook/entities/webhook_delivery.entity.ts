import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid', { name: 'deliveryId' })
  deliveryId!: string;

  @Index()
  @Column({ type: 'uuid' })
  webhookId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  event!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  // PENDING | SUCCESS | FAILED
  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts!: number;

  @Column({ type: 'text' })
  requestBody!: string;

  @Column({ type: 'int', nullable: true })
  responseStatus!: number | null;

  @Column({ type: 'text', nullable: true })
  responseBody!: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  // Round-trip time in milliseconds
  @Column({ type: 'int', nullable: true })
  duration!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
