import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, Unique } from 'typeorm';

/**
 * SCIM 2.0 Group (RFC 7644 §3.5) — provisioned by an enterprise IdP (Okta,
 * Azure AD, OneLogin). A group's displayName maps to an internal member role
 * via the per-tenant scimGroupRoleMap. `idp` namespaces the group for
 * multi-IdP tenants (e.g. Okta + Azure AD running side by side).
 */
@Unique(['tenantId', 'idp', 'displayName'])
@Entity('scim_groups')
export class ScimGroup {
  @PrimaryGeneratedColumn('uuid', { name: 'scimGroupId' })
  scimGroupId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  /** Source IdP label for multi-IdP tenants ('default' when single-IdP). */
  @Index()
  @Column({ type: 'varchar', length: 64, default: 'default' })
  idp!: string;

  @Column({ type: 'varchar' })
  displayName!: string;

  @Index()
  @Column({ type: 'varchar', length: 256, nullable: true })
  externalId?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
