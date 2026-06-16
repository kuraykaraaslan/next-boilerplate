import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * A prepaid gift card. The human-readable `code` is shown once at issue time;
 * lookups and redemption go through the SHA-256 `codeHash` so a leaked database
 * row never exposes a spendable code (mirrors the api_key hashing pattern).
 * Amounts are integer minor units (e.g. cents) in `currency`.
 */
@Unique(['tenantId', 'code'])
@Entity('gift_cards')
export class GiftCard {
  @PrimaryGeneratedColumn('uuid', { name: 'giftCardId' })
  giftCardId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  /** Display code, e.g. `GC-XXXX-XXXX-XXXX`. Stored uppercased. */
  @Column({ type: 'varchar', length: 32 })
  code!: string;

  /** SHA-256 of the raw code — the redemption lookup key. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  codeHash!: string;

  @Index()
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string;

  @Column({ type: 'int' })
  initialAmount!: number;

  @Column({ type: 'int' })
  remainingAmount!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ nullable: true, type: 'uuid' })
  purchaserUserId?: string;

  @Column({ nullable: true, type: 'uuid' })
  purchaserPaymentId?: string;

  @Column({ nullable: true, type: 'varchar' })
  recipientEmail?: string;

  @Column({ nullable: true, type: 'uuid' })
  recipientUserId?: string;

  @Column({ nullable: true, type: 'text' })
  message?: string;

  @Column({ nullable: true, type: 'timestamp' })
  expiresAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  lastRedeemedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
