import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, Unique } from 'typeorm';

@Unique(['tenantId', 'userId'])
@Entity('tenant_members')
export class TenantMember {
  @PrimaryGeneratedColumn('uuid', { name: 'tenantMemberId' })
  tenantMemberId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', default: 'USER' })
  memberRole!: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  memberStatus!: string;

  /**
   * SCIM 2.0 externalId — opaque identifier minted by the upstream IdP
   * (Okta/Azure AD/OneLogin/Google Workspace) for cross-system correlation.
   * Per tenant, externalIds must be unique when present; null is allowed
   * for members that were not provisioned via SCIM.
   *
   * Partial unique index is added via migration on
   * `(tenantId, externalId) WHERE externalId IS NOT NULL`.
   */
  @Index('IDX_tenant_members_tenant_external', ['tenantId', 'externalId'])
  @Column({ type: 'varchar', length: 256, nullable: true })
  externalId?: string | null;

  @Column({ type: 'int', default: 0 })
  sessionVersion!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
