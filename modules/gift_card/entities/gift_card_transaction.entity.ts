import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Append-only ledger of every balance movement on a gift card. `amount` is
 * signed (negative for REDEEM/VOID); `balanceAfter` snapshots the remaining
 * balance after the movement. `walletTransactionId` links a REDEEM row to the
 * wallet credit it produced.
 */
@Entity('gift_card_transactions')
export class GiftCardTransaction {
  @PrimaryGeneratedColumn('uuid', { name: 'giftCardTransactionId' })
  giftCardTransactionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  giftCardId!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'int' })
  balanceAfter!: number;

  @Column({ nullable: true, type: 'uuid' })
  walletTransactionId?: string;

  @Column({ nullable: true, type: 'uuid' })
  userId?: string;

  @Column({ nullable: true, type: 'text' })
  note?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
