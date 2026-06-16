import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * A legal agreement definition (terms of use, privacy/KVKK, distance-selling,
 * pre-information, refund policy, cookie, custom). The actual text lives in
 * immutable {@link AgreementVersion} rows; this row is the stable handle a tenant
 * manages and consumers reference by `type` or `key`.
 */
@Entity('agreements')
@Unique('uq_agreements_tenant_key', ['tenantId', 'key'])
export class Agreement {
  @PrimaryGeneratedColumn('uuid', { name: 'agreementId' })
  agreementId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // One of AgreementType. Indexed for fast "which terms-of-use does this tenant
  // have" / checkout lookups.
  @Index()
  @Column({ type: 'varchar' })
  type!: string;

  // Stable slug, unique per tenant (e.g. 'terms-of-use', 'distance-selling').
  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // Whether acceptance is required (vs. informational only).
  @Column({ type: 'boolean', default: true })
  requiresAcceptance!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
