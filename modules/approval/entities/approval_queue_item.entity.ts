import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A generic moderation / approval queue item. Keyed by `(entityType, entityId)`
 * so any owning module can route an entity (a store product, a blog post, a
 * user profile, a flagged message, …) through human review without this module
 * needing to know about it. The owning module reacts to a terminal decision via
 * the in-memory `registerHandler` hook on `ApprovalQueueService`.
 *
 * Tamper-evidence: a per-tenant append-only hash chain (`prevHash` / `rowHash`)
 * over the decision-relevant content, mirroring `audit_log` and `wallet`. Every
 * mutation (submit, claim, decide) re-links the row so an after-the-fact edit
 * to a decision is detectable by `verifyChain`.
 */
@Entity('approval_queue_items')
@Index('idx_approval_tenant_status', ['tenantId', 'status'])
@Index('idx_approval_tenant_entity', ['tenantId', 'entityType', 'entityId'])
// At most one OPEN item per (tenant, entityType, entityId). Postgres partial
// unique index: terminal items (APPROVED / REJECTED) are excluded so an entity
// can be re-submitted after a prior decision, but never have two open items.
@Index('uq_approval_open_entity', ['tenantId', 'entityType', 'entityId'], {
  unique: true,
  where: "status NOT IN ('APPROVED', 'REJECTED')",
})
export class ApprovalQueueItem {
  @PrimaryGeneratedColumn('uuid', { name: 'approvalItemId' })
  approvalItemId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // Domain tag for the entity under review (e.g. 'store_product', 'blog_post').
  @Column({ type: 'varchar', length: 64 })
  entityType!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  // The user who submitted / triggered the item; null for system-flagged items.
  @Column({ type: 'uuid', nullable: true })
  submittedByUserId!: string | null;

  // ApprovalStatus — PENDING | IN_REVIEW | APPROVED | REJECTED | ESCALATED
  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: string;

  // Higher = more urgent; drives the SLA bucket.
  @Column({ type: 'int', default: 0 })
  priority!: number;

  // Why the item was submitted / flagged.
  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  // The reviewer's note recorded with the decision.
  @Column({ type: 'text', nullable: true })
  decisionNote!: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  slaDueAt!: Date | null;

  // Append-only hash chain (tamper evidence). `rowHash` = sha256(prevHash +
  // canonical(row)); `prevHash` is the previous item's rowHash for the same
  // tenant (null for the first row).
  @Column({ type: 'varchar', length: 64, nullable: true })
  prevHash!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  rowHash!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
