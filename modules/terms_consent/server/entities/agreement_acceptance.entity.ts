import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * An append-only record that a subject accepted (or declined) a specific
 * agreement at a moment in time. The hybrid verbatim strategy lives here:
 *
 *  - Reusable agreements (terms, privacy): `versionId` + `contentHash` point at
 *    the immutable {@link AgreementVersion}; the text isn't duplicated.
 *  - Order-specific agreements (distance-selling, pre-information): the per-order
 *    rendered text is stored verbatim in `contentSnapshot` (+ its `contentHash`)
 *    and bound to `orderRef`, because there is no reusable version.
 *
 * Either way `contentHash` proves integrity and the exact accepted text is
 * recoverable.
 */
@Entity('agreement_acceptances')
export class AgreementAcceptance {
  @PrimaryGeneratedColumn('uuid', { name: 'acceptanceId' })
  acceptanceId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  agreementId!: string | null;

  // Denormalized agreement type for fast checkout-gate lookups.
  @Index()
  @Column({ type: 'varchar' })
  agreementType!: string;

  // The immutable version accepted (reusable docs). Null for ad-hoc order docs.
  @Column({ type: 'uuid', nullable: true })
  versionId!: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  subjectUserId!: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  subjectAnonymousId!: string | null;

  @Column({ type: 'boolean', default: true })
  accepted!: boolean;

  // SHA-256 hex of exactly what the subject accepted (version content or snapshot).
  @Column({ type: 'varchar' })
  contentHash!: string;

  // Verbatim accepted text — set for order-specific rendered documents.
  @Column({ type: 'text', nullable: true })
  contentSnapshot!: string | null;

  // The agreement version label at acceptance (e.g. '3'), for display/audit.
  @Column({ type: 'varchar', nullable: true })
  versionLabel!: string | null;

  // Order/checkout reference this acceptance is bound to (order-specific docs).
  @Index()
  @Column({ type: 'varchar', nullable: true })
  orderRef!: string | null;

  // Free-form context (source, locale, order summary, …).
  @Column({ type: 'jsonb', nullable: true })
  context!: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
