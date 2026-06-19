import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Cross-tenant install record for a community (third-party) marketplace listing.
 * The plugin runtime resolves installs from per-tenant Setting keys; this table
 * is the *aggregatable* source of truth so publishers can see install/active
 * counts for their listings (Setting keys are not queryable across tenants).
 * One row per (listingId, tenantId). System-scoped.
 */
@Entity('marketplace_community_installs')
@Unique(['listingId', 'tenantId'])
export class CommunityInstall {
  @PrimaryGeneratedColumn('uuid', { name: 'installId' })
  installId!: string;

  @Index()
  @Column({ type: 'uuid' })
  listingId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  /** The listing version that was installed. */
  @Column({ type: 'uuid', nullable: true })
  versionId!: string | null;

  /** Whether the install is currently active (vs. installed-but-disabled). */
  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  installedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
