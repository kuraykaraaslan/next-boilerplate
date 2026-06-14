import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * The envelope for one balanced movement. Append-only — never updated or
 * deleted. Its `WalletPosting` legs carry the signed amounts and sum to zero.
 *
 * `idempotencyKey` (unique per tenant) makes a retried post a no-op replay:
 * the same key returns the existing transaction instead of double-posting.
 */
@Entity('wallet_transactions')
@Index('uq_wallet_txn_idem', ['tenantId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotencyKey" IS NOT NULL',
})
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid', { name: 'walletTransactionId' })
  walletTransactionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // TransactionType — ISSUE | TRANSFER | SPEND | REFUND | BOOKING_CAPTURE | ...
  @Index()
  @Column({ type: 'varchar', length: 32 })
  type!: string;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  referenceType!: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  referenceId!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 12 })
  currency!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotencyKey!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
