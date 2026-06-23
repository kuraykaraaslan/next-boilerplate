import 'reflect-metadata';
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, Unique,
} from 'typeorm';

/**
 * Tenant-configurable carrier master-data. Drives the carrier allowlist and
 * the per-carrier tracking-URL pattern ("https://track.example.com/{tracking}")
 * used to build customer-facing tracking links.
 */
@Unique(['tenantId', 'code'])
@Entity('fulfillment_carriers')
export class Carrier {
  @PrimaryGeneratedColumn('uuid', { name: 'carrierId' })
  carrierId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  // Stable per-tenant code (e.g. "UPS", "DHL") matched against the fulfillment's
  // carrier field for the allowlist check.
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  // Tracking-URL template; `{tracking}` is substituted with the tracking number.
  @Column({ nullable: true, type: 'varchar' })
  trackingUrlPattern?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
