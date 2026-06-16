import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

export const ALLOWED_REGIONS = ['TR', 'EU', 'US', 'APAC', 'LATAM', 'MEA'] as const;
export type TenantRegion = (typeof ALLOWED_REGIONS)[number];

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid', { name: 'tenantId' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  tenantStatus!: string;

  // URL-safe unique handle for path-based tenancy (e.g. /t/acme-corp)
  @Index({ unique: true, where: '"slug" IS NOT NULL' })
  @Column({ nullable: true, type: 'varchar', length: 63 })
  slug?: string;

  // Validated against ALLOWED_REGIONS for data-residency routing
  @Column({ nullable: true, type: 'varchar', length: 16 })
  region?: string;

  // Arbitrary operator metadata: VAT number, CRM IDs, fiscal codes, etc.
  @Column({ nullable: true, type: 'jsonb', default: '{}' })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  deletionRequestedAt?: Date;

  @Column({ nullable: true, type: 'timestamp' })
  deleteAfter?: Date;
}
