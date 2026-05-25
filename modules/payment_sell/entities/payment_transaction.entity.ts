import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid', { name: 'transactionId' })
  transactionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  paymentId!: string;

  @Index()
  @Column({ type: 'varchar' })
  provider!: string;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  providerTransactionId?: string;

  @Index()
  @Column({ type: 'varchar', default: 'PAYMENT' })
  type!: string;

  @Index()
  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  fee?: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  net?: number;

  @Column({ type: 'jsonb', nullable: true })
  providerResponse?: unknown;

  @Column({ nullable: true, type: 'varchar' })
  errorCode?: string;

  @Column({ nullable: true, type: 'text' })
  errorMessage?: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  parentTransactionId?: string;

  @Column({ nullable: true, type: 'varchar', length: 45 })
  ipAddress?: string;

  @Column({ nullable: true, type: 'text' })
  userAgent?: string;

  @Column({ nullable: true, type: 'timestamp' })
  processedAt?: Date;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
