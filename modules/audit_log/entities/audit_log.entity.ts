import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, Index } from 'typeorm';

// Compound index backing the hot read path: getAll always filters by tenantId
// and orders by createdAt DESC. Without it, large tenants pay an index scan on
// tenantId followed by a sort.
@Index('IDX_audit_logs_tenant_created', ['tenantId', 'createdAt'])
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid', { name: 'auditLogId' })
  auditLogId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ nullable: true, type: 'uuid' })
  actorId?: string | null;

  @Column({ type: 'varchar', default: 'SYSTEM' })
  actorType!: string;

  // Dual-actor (impersonation context): when a platform admin acts on behalf of
  // a tenant user, `actorId` stays the TRUE actor (the admin) and
  // `onBehalfOfActorId` carries the impersonated user. Nullable + additive so
  // callers that don't set it (the common case) are unaffected.
  @Index()
  @Column({ nullable: true, type: 'uuid' })
  onBehalfOfActorId?: string | null;

  @Index()
  @Column({ type: 'varchar' })
  action!: string;

  // Risk classification for the action (low | medium | high | critical).
  @Index()
  @Column({ type: 'varchar', default: 'low' })
  severity!: string;

  @Index()
  @Column({ nullable: true, type: 'varchar' })
  resourceType?: string | null;

  @Column({ nullable: true, type: 'varchar' })
  resourceId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: unknown;

  @Column({ nullable: true, type: 'varchar' })
  ipAddress?: string | null;

  @Column({ nullable: true, type: 'text' })
  userAgent?: string | null;

  // Append-only hash chain (tamper evidence). `rowHash` = sha256(prevHash +
  // canonical(row)); `prevHash` is the previous row's rowHash for the same
  // tenant (null for the first row). verifyChain() recomputes and compares.
  @Column({ nullable: true, type: 'varchar' })
  prevHash?: string | null;

  @Column({ nullable: true, type: 'varchar' })
  rowHash?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  // Soft-delete guard. Normal reads (getAll) exclude soft-deleted rows; the
  // retention purge hard-deletes after archiving.
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date | null;
}
