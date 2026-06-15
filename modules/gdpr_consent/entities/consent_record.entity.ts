import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * An append-only consent ledger row. Each row records ONE subject's grant or
 * withdraw decision for ONE purpose at a point in time. Rows are never updated
 * or deleted — the latest row per (subject, purpose) is the current state (see
 * {@link deriveConsentState}). The subject is identified by EITHER an
 * authenticated `subjectUserId` OR an anonymous `subjectAnonymousId` (banner
 * visitors). Data export/erasure is handled separately by `tenant_export`.
 */
@Entity('consent_records')
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid', { name: 'consentId' })
  consentId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // One of subjectUserId / subjectAnonymousId identifies the consenting subject.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  subjectUserId!: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  subjectAnonymousId!: string | null;

  // One of the ConsentPurpose enum values (necessary/functional/analytics/marketing).
  @Column({ type: 'varchar' })
  purpose!: string;

  // The decision: true = granted, false = withdrawn/refused.
  @Column({ type: 'boolean' })
  granted!: boolean;

  // Version of the cookie/privacy policy the subject consented against.
  @Column({ type: 'varchar' })
  policyVersion!: string;

  // Where the decision originated (ConsentSource enum: banner/api/import/admin).
  @Column({ type: 'varchar' })
  source!: string;

  @Column({ type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  // Append-only: there is intentionally no UpdateDateColumn.
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
