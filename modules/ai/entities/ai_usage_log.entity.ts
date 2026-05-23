import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Per-call AI usage audit row. Written by AIService after every successful
 * chat / chatStream / embed call. Aggregated by the tenant_usage CRON for
 * billing — this table is the source of truth for "what did each model do"
 * whereas `TenantUsage.aiTokens` is the monthly aggregate counter.
 */
@Entity('ai_usage_logs')
export class AiUsageLog {
  @PrimaryGeneratedColumn('uuid', { name: 'aiUsageLogId' })
  aiUsageLogId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId?: string;

  @Index()
  @Column({ type: 'varchar' })
  provider!: string; // openai, anthropic, google

  @Column({ type: 'varchar' })
  model!: string;

  @Column({ type: 'varchar', default: 'chat' })
  kind!: string; // chat | stream | embed

  @Column({ type: 'int', default: 0 })
  inputTokens!: number;

  @Column({ type: 'int', default: 0 })
  outputTokens!: number;

  @Column({ type: 'int', default: 0 })
  totalTokens!: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 6 })
  costUsd?: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
