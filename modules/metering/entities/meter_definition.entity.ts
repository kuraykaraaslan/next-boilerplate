import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { bigintTransformer } from '../metering.constants';

/**
 * A meter — the definition of a billable usage dimension (e.g. `api_calls`,
 * `storage_gb`). Usage events reference a meter by id and carry its `key`
 * denormalized for fast aggregation. `aggregation` decides how the period's
 * events collapse into a single total; `includedQuantity` is the free
 * allowance per period and `unitPriceMinor` the overage price per unit (minor
 * units of `currency`).
 *
 * One meter per (tenant, key) — the unique index makes `getOrCreate`
 * idempotent and race-safe.
 */
@Entity('meter_definitions')
@Index('uq_meter_def_key', ['tenantId', 'key'], { unique: true })
export class MeterDefinition {
  @PrimaryGeneratedColumn('uuid', { name: 'meterId' })
  meterId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // Stable machine key referenced by events (e.g. 'api_calls').
  @Column({ type: 'varchar', length: 64 })
  key!: string;

  // Human-readable name.
  @Column({ type: 'varchar', length: 128 })
  name!: string;

  // Unit of measure label (e.g. 'request', 'GB', 'seat').
  @Column({ type: 'varchar', length: 32 })
  unit!: string;

  // MeterAggregation — SUM | MAX | LAST.
  @Column({ type: 'varchar', length: 8, default: 'SUM' })
  aggregation!: string;

  // Overage price per unit, in minor units of `currency`.
  @Column({ type: 'bigint', default: '0', transformer: bigintTransformer })
  unitPriceMinor!: bigint;

  @Index()
  @Column({ type: 'varchar', length: 12, default: 'USD' })
  currency!: string;

  // Free allowance per period (minor-unit quantity). Usage up to this is free.
  @Column({ type: 'bigint', default: '0', transformer: bigintTransformer })
  includedQuantity!: bigint;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
