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
 * One per-subject, per-period overage settlement. Append-only audit of a
 * two-rail settlement: prepaid wallet credits are debited first
 * (`walletDebitedMinor` / `walletTransactionId`), and any remainder is
 * invoiced (`invoicedMinor` / `invoiceId`). `lines` snapshots the per-meter
 * computation so the run is self-describing even if a meter later changes.
 *
 * `idempotencyKey` (unique per tenant when present) makes a retried run a no-op
 * replay: the same key returns the existing run instead of double-charging.
 */
@Entity('metered_billing_runs')
@Index('idx_meter_run_subject', ['tenantId', 'subjectId', 'periodKey'])
@Index('uq_meter_run_idem', ['tenantId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotencyKey" IS NOT NULL',
})
export class MeteredBillingRun {
  @PrimaryGeneratedColumn('uuid', { name: 'billingRunId' })
  billingRunId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // SubjectType — TENANT | USER | SUBSCRIPTION.
  @Column({ type: 'varchar', length: 16 })
  subjectType!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  subjectId!: string | null;

  // UTC YYYY-MM period being settled.
  @Column({ type: 'varchar', length: 7 })
  periodKey!: string;

  // BillingRunStatus — PENDING | COMPLETED | FAILED.
  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: string;

  /**
   * Per-meter computation snapshot. Each entry:
   * { meterKey, usedQuantity, includedQuantity, billableQuantity,
   *   unitPriceMinor, amountMinor } — all bigint values serialized as strings.
   */
  @Column({ type: 'jsonb', nullable: true })
  lines!: MeteredBillingRunLine[] | null;

  @Column({ type: 'varchar', length: 12, default: 'USD' })
  currency!: string;

  @Column({ type: 'bigint', default: '0', transformer: bigintTransformer })
  totalMinor!: bigint;

  @Column({ type: 'bigint', default: '0', transformer: bigintTransformer })
  walletDebitedMinor!: bigint;

  @Column({ type: 'bigint', default: '0', transformer: bigintTransformer })
  invoicedMinor!: bigint;

  @Column({ type: 'uuid', nullable: true })
  walletTransactionId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  invoiceId!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotencyKey!: string | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

/** A single per-meter line in a billing run's `lines` snapshot (string money). */
export interface MeteredBillingRunLine {
  meterKey: string;
  usedQuantity: string;
  includedQuantity: string;
  billableQuantity: string;
  unitPriceMinor: string;
  amountMinor: string;
}
