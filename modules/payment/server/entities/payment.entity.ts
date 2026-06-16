import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid', { name: 'paymentId' })
  paymentId!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId?: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  tenantId?: string;

  @Index()
  @Column({ type: 'varchar' })
  provider!: string;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  providerPaymentId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  amount!: number;

  @Index()
  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Index()
  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @Column({ nullable: true, type: 'varchar' })
  paymentMethod?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @Column({ nullable: true, type: 'varchar' })
  customerEmail?: string;

  @Column({ nullable: true, type: 'varchar' })
  customerName?: string;

  @Column({ nullable: true, type: 'varchar' })
  customerPhone?: string;

  @Column({ type: 'jsonb', nullable: true })
  billingAddress?: unknown;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  refundedAmount?: number;

  @Column({ nullable: true, type: 'varchar' })
  failureCode?: string;

  @Column({ nullable: true, type: 'text' })
  failureMessage?: string;

  @Column({ nullable: true, type: 'timestamp' })
  paidAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  cancelledAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  refundedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  expiresAt?: Date;

  // ── Chargeback / dispute tracking ───────────────────────────────────────
  // null = no dispute; otherwise NEEDS_RESPONSE | UNDER_REVIEW | WON | LOST.
  @Column({ nullable: true, type: 'varchar' })
  disputeStatus?: string;

  @Column({ nullable: true, type: 'varchar' })
  disputeReason?: string;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  disputeAmount?: number;

  @Column({ nullable: true, type: 'varchar' })
  providerDisputeId?: string;

  @Column({ nullable: true, type: 'timestamp' })
  disputedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  disputeResolvedAt?: Date;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
