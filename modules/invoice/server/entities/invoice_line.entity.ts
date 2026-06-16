import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('invoice_lines')
export class InvoiceLine {
  @PrimaryGeneratedColumn('uuid', { name: 'invoiceLineId' })
  invoiceLineId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Column({ type: 'varchar' })
  description!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  unitPrice!: number;

  /** Decimal rate: 0.20 = 20%. */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  taxRate!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, transformer: { to: (v) => v, from: (v) => v == null ? v : parseFloat(v) } })
  lineTotal!: number;

  /** 'subscription' | 'one_off' | 'usage' | 'credit' | 'proration' */
  @Column({ nullable: true, type: 'varchar' })
  sourceType?: string;

  @Column({ nullable: true, type: 'varchar' })
  sourceId?: string;

  @Column({ nullable: true, type: 'jsonb' })
  metadata?: object;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
