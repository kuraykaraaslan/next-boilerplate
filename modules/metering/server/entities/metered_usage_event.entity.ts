import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { bigintTransformer } from '../metering.constants';

/**
 * An immutable usage event — append-only, never updated or deleted. The
 * authoritative record of metered usage; period totals are re-derived from
 * these rows (the Redis hot counter is only a fast-read cache).
 *
 * `idempotencyKey` (unique per tenant when present) makes a retried record a
 * no-op replay: the same key returns the existing event instead of
 * double-counting (mirrors `wallet_transactions`' partial unique idem index).
 * `periodKey` is the denormalized UTC `YYYY-MM` of `occurredAt` for fast,
 * index-backed period aggregation.
 */
@Entity('metered_usage_events')
@Index('idx_meter_event_period', ['tenantId', 'meterKey', 'periodKey'])
@Index('uq_meter_event_idem', ['tenantId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotencyKey" IS NOT NULL',
})
export class MeteredUsageEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'usageEventId' })
  usageEventId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  meterId!: string;

  // Denormalized meter key for index-backed aggregation without a join.
  @Column({ type: 'varchar', length: 64 })
  meterKey!: string;

  // SubjectType — TENANT | USER | SUBSCRIPTION.
  @Column({ type: 'varchar', length: 16 })
  subjectType!: string;

  // The user / subscription id; null for tenant-wide usage.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  subjectId!: string | null;

  // Quantity in minor units (transformer keeps it a BigInt in memory).
  @Column({ type: 'bigint', transformer: bigintTransformer })
  quantity!: bigint;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotencyKey!: string | null;

  // When the usage actually happened (caller-supplied or now).
  @Index()
  @Column({ type: 'timestamp' })
  occurredAt!: Date;

  // UTC YYYY-MM of occurredAt — denormalized for fast aggregation.
  @Column({ type: 'varchar', length: 7 })
  periodKey!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
