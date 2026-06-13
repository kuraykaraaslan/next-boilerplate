import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn('uuid', { name: 'taxRateId' })
  taxRateId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // Null = this rate applies to ALL tax classes (e.g. a country-wide surcharge).
  @Index()
  @Column({ nullable: true, type: 'uuid' })
  taxClassId?: string;

  // Human-readable name, e.g. 'TR KDV %20', 'DE MwSt 19%'
  @Column({ type: 'varchar' })
  name!: string;

  // ISO-3166-1 alpha-2 country code. Null = matches any destination country.
  @Index()
  @Column({ nullable: true, type: 'varchar' })
  countryCode?: string;

  // State / province. Null = matches any region within the matched country.
  @Column({ nullable: true, type: 'varchar' })
  region?: string;

  // Optional prefix or regex string tested against the destination postal code.
  // Null = matches any postal code.
  @Column({ nullable: true, type: 'varchar' })
  postalCodePattern?: string;

  // Percentage value. 20.0000 means 20%. Stored with 4 decimal places of rate precision.
  @Column({ type: 'decimal', precision: 6, scale: 4 })
  rate!: number;

  // When true, this rate is compounded on top of (net + prior taxes) on the same line.
  @Column({ type: 'boolean', default: false })
  isCompound!: boolean;

  // When true, the supplied line amount is treated as tax-inclusive (gross),
  // and the net is backed out before computing tax.
  @Column({ type: 'boolean', default: false })
  includedInPrice!: boolean;

  // Lower priority applies first. Matters for compound ordering.
  @Index()
  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Index()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // ── Effective dating (rate-change history) ──────────────────────────────
  // A rate only applies to a calculation whose date falls within the window.
  // Null effectiveFrom = always-in-effect from creation; null effectiveTo =
  // open-ended. Lets a tenant schedule a VAT change without deleting the old
  // rate, preserving the audit history of what applied when.
  @Column({ nullable: true, type: 'timestamp' })
  effectiveFrom?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  effectiveTo?: Date;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
