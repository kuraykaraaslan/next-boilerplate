import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Generated,
  Index,
} from 'typeorm';
import { bigintTransformer } from '../wallet.constants';

/**
 * A single signed leg of a transaction (credit +, debit −) against one account.
 * `balanceAfter` snapshots the account balance after this posting.
 *
 * Tamper-evidence: per-account hash chain. `rowHash = sha256(prevHash +
 * canonical(row))`, `prevHash` is the previous posting's rowHash for the SAME
 * account. `verifyChain` re-derives the chain to detect any after-the-fact
 * edit. Per-account (not per-tenant) so a wallet statement verifies
 * independently and balanceAfter stays meaningful within one account.
 */
@Entity('wallet_postings')
@Index('idx_wallet_posting_account_created', ['accountId', 'createdAt'])
export class WalletPosting {
  @PrimaryGeneratedColumn('uuid', { name: 'walletPostingId' })
  walletPostingId!: string;

  // Monotonic insertion order (DB sequence). The per-account hash chain is
  // walked by `seq` so it is deterministic even when two postings share a
  // millisecond `createdAt`.
  @Index()
  @Column({ type: 'bigint' })
  @Generated('increment')
  seq!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  transactionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  accountId!: string;

  // Signed minor units. bigint <-> BigInt via transformer.
  @Column({ type: 'bigint', transformer: bigintTransformer })
  amount!: bigint;

  @Column({ type: 'varchar', length: 12 })
  currency!: string;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  balanceAfter!: bigint;

  @Column({ type: 'varchar', length: 64, nullable: true })
  prevHash!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  rowHash!: string | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
