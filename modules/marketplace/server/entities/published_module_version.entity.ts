import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

export type VersionReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * A submitted version of a listing, awaiting (or having completed) review. The
 * `manifestJson` is validated against module.schema.json on submit. System-scoped.
 */
@Entity('marketplace_listing_versions')
export class PublishedModuleVersion {
  @PrimaryGeneratedColumn('uuid', { name: 'versionId' })
  versionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  listingId!: string;

  @Column({ type: 'varchar' })
  version!: string;

  /** Full module.json snapshot for this version (validated on submit). */
  @Column({ type: 'text' })
  manifestJson!: string;

  @Column({ type: 'text', nullable: true })
  readmeMd!: string | null;

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  screenshots!: string[] | null;

  /** npm package name or git url#ref (where the code lives — not executed here). */
  @Column({ type: 'varchar', nullable: true })
  packageRef!: string | null;

  @Index()
  @Column({ type: 'varchar', default: 'pending' })
  reviewStatus!: VersionReviewStatus;

  @Column({ type: 'text', nullable: true })
  reviewNotes!: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  submittedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;
}
