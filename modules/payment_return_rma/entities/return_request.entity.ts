import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { DEFAULT_CURRENCY } from '@/modules/common';

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

  @Column({ type: 'varchar', length: 3, default: DEFAULT_CURRENCY })
  currency!: string;

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
