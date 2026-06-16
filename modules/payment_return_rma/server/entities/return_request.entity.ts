import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { DEFAULT_CURRENCY } from '@nb/common';

@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid', { name: 'returnRequestId' })
  returnRequestId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // references an order in a future order module
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string;

  // optional link to the original payment (payment_sell) so a refund can be issued
  @Index()
  @Column({ nullable: true, type: 'uuid' })
  paymentId?: string | null;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  userId?: string;

  // human-readable RMA identifier, e.g. 'RMA-XXXXXX'
  @Index()
  @Column({ type: 'varchar' })
  rmaNumber!: string;

  @Index()
  @Column({ type: 'varchar', default: 'RETURN' })
  type!: string;

  @Index()
  @Column({ type: 'varchar', default: 'REQUESTED' })
  status!: string;

  @Column({ nullable: true, type: 'varchar' })
  reason?: string;

  @Column({ nullable: true, type: 'text' })
  customerNote?: string;

  @Column({ nullable: true, type: 'text' })
  adminNote?: string;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  refundAmount?: number;

  // Restocking fee deducted from the refund (absolute amount).
  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  restockingFee?: number;

  // CASH | STORE_CREDIT | GIFT_CARD — how the refund was issued.
  @Column({ nullable: true, type: 'varchar' })
  refundMethod?: string;

  @Column({ type: 'varchar', length: 3, default: DEFAULT_CURRENCY })
  currency!: string;

  // ── Return shipment (prepaid label + tracking) ──────────────────────────
  @Column({ nullable: true, type: 'varchar' })
  returnCarrier?: string;

  @Column({ nullable: true, type: 'varchar' })
  returnTrackingNumber?: string;

  @Column({ nullable: true, type: 'varchar' })
  returnLabelUrl?: string;

  // Cross-border customs documentation (HS codes, declared values, …).
  @Column({ type: 'jsonb', nullable: true })
  customsData?: unknown;

  // SLA: when this return must reach its next milestone (escalation source).
  @Index()
  @Column({ nullable: true, type: 'timestamp' })
  slaDueAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @Column({ nullable: true, type: 'timestamp' })
  approvedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  receivedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  refundedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  cancelledAt?: Date;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
