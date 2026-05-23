import 'reflect-metadata';
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  Index, Unique,
} from 'typeorm';

@Unique(['tenantId', 'invoiceNumber'])
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid', { name: 'invoiceId' })
  invoiceId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  /** Per-tenant monotonic sequence — e.g. `INV-2025-00001`. */
  @Column({ type: 'varchar' })
  invoiceNumber!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  paymentId?: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  subscriptionId?: string;

  // ── Customer (denormalised — invoice is immutable once issued) ─────────────
  @Column({ type: 'varchar' })
  customerEmail!: string;

  @Column({ type: 'varchar' })
  customerName!: string;

  @Column({ nullable: true, type: 'varchar' })
  customerTaxId?: string;

  @Column({ nullable: true, type: 'jsonb' })
  customerAddress?: object;

  /** ISO 3166-1 alpha-2 — used by regional adapters to pick a sub-flow. */
  @Column({ type: 'varchar', length: 2 })
  customerCountryCode!: string;

  // ── Dates ───────────────────────────────────────────────────────────────────
  @Column({ type: 'timestamp' })
  issueDate!: Date;

  @Column({ nullable: true, type: 'timestamp' })
  dueDate?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  paidAt?: Date;

  // ── Amounts ─────────────────────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 14, scale: 4 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  // ── Classification ──────────────────────────────────────────────────────────
  @Index()
  @Column({ type: 'varchar', default: 'draft' })
  status!: string;

  /** TR | EU | US | OTHER — drives adapter selection. */
  @Column({ type: 'varchar', default: 'OTHER' })
  region!: string;

  /** KDV | VAT | SALES_TAX | NONE */
  @Column({ type: 'varchar', default: 'NONE' })
  taxScheme!: string;

  // ── Regional submission state ──────────────────────────────────────────────
  // TR — e-Arşiv / e-Fatura via GİB integrator
  @Column({ nullable: true, type: 'varchar' })
  earsivUuid?: string;

  @Column({ nullable: true, type: 'varchar' })
  earsivStatus?: string;

  @Column({ nullable: true, type: 'varchar' })
  earsivIntegrator?: string;

  // EU — Peppol BIS Billing 3.0
  @Column({ nullable: true, type: 'varchar' })
  peppolDocumentId?: string;

  @Column({ nullable: true, type: 'varchar' })
  peppolStatus?: string;

  // US — Stripe Tax calculation id
  @Column({ nullable: true, type: 'varchar' })
  stripeTaxCalculationId?: string;

  // ── Files / extras ─────────────────────────────────────────────────────────
  @Column({ nullable: true, type: 'varchar' })
  pdfStorageKey?: string;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ nullable: true, type: 'jsonb' })
  metadata?: object;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true, type: 'timestamp' })
  deletedAt?: Date;
}
