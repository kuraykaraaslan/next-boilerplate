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
import { bigintTransformer } from '../wallet.constants';

/**
 * A wallet / ledger account. Either a user-held credit balance (`USER_WALLET`)
 * or a system contra-account (`SYSTEM_*`). `cachedBalance` is the denormalized
 * running balance for O(1) reads; the authoritative value is the sum of this
 * account's postings (asserted by reconcile).
 *
 * One account per (tenant, owner, kind, currency) — the unique index makes
 * provisioning idempotent and race-safe.
 */
@Entity('wallet_accounts')
@Index('uq_wallet_account_owner', ['tenantId', 'ownerType', 'ownerId', 'kind', 'currency'], {
  unique: true,
})
export class WalletAccount {
  @PrimaryGeneratedColumn('uuid', { name: 'walletAccountId' })
  walletAccountId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // 'USER' | 'SYSTEM' | 'TENANT'
  @Column({ type: 'varchar', length: 16 })
  ownerType!: string;

  // The user id for USER_WALLET; null for tenant-wide system accounts.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null;

  // AccountKind — USER_WALLET | SYSTEM_ISSUER | SYSTEM_REVENUE | SYSTEM_ESCROW | SYSTEM_FEE
  @Index()
  @Column({ type: 'varchar', length: 32 })
  kind!: string;

  // Unit of account — an ISO 4217 currency code (defaults to USD).
  @Index()
  @Column({ type: 'varchar', length: 12, default: 'USD' })
  currency!: string;

  // Denormalized running balance in minor units. bigint <-> BigInt via transformer.
  @Column({ type: 'bigint', default: '0', transformer: bigintTransformer })
  cachedBalance!: bigint;

  // User wallets cannot go negative; system contra-accounts can.
  @Column({ type: 'boolean', default: false })
  allowOverdraft!: boolean;

  // 'ACTIVE' | 'FROZEN' | 'CLOSED'
  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
