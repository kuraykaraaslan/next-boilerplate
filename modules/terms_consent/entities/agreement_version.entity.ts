import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * An immutable, hash-stamped version of an agreement's text. Once `status` is
 * `published` the `content` and `contentHash` MUST NOT change — a correction is a
 * new version. This is what makes "prove exactly what the user accepted"
 * possible: an acceptance references a versionId + the contentHash frozen here.
 *
 * For order-specific agreement types (distance-selling, pre-information) the
 * `content` is a TEMPLATE with `{{placeholders}}`; the per-order rendered text is
 * stored verbatim on the acceptance row instead (see AgreementAcceptance).
 */
@Entity('agreement_versions')
@Unique('uq_agreement_version', ['agreementId', 'version'])
export class AgreementVersion {
  @PrimaryGeneratedColumn('uuid', { name: 'versionId' })
  versionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  agreementId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // Monotonic per-agreement version number (1, 2, 3, …).
  @Column({ type: 'integer' })
  version!: number;

  // The agreement body. Template (with {{placeholders}}) for order-specific types.
  @Column({ type: 'text' })
  content!: string;

  // SHA-256 hex of `content` at publish time — tamper-evidence.
  @Column({ type: 'varchar' })
  contentHash!: string;

  // Document language (BCP-47-ish, e.g. 'en', 'tr').
  @Column({ type: 'varchar', default: 'en' })
  language!: string;

  // draft | published | archived
  @Column({ type: 'varchar', default: 'draft' })
  status!: string;

  // When this version becomes legally effective (informational).
  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt!: Date | null;

  // Exactly one published version per agreement is the current one consumers get.
  @Index()
  @Column({ type: 'boolean', default: false })
  isCurrent!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
