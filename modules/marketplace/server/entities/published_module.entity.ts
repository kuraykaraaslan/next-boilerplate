import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ListingVisibility = 'public' | 'private';
export type ListingStatus = 'draft' | 'in_review' | 'published' | 'rejected' | 'unpublished';

/**
 * A published (or in-progress) module listing in the marketplace registry.
 * Listing-only: this is catalog metadata; the module's code is not executed by
 * the platform in this phase. System-scoped.
 */
@Entity('marketplace_listings')
export class PublishedModule {
  @PrimaryGeneratedColumn('uuid', { name: 'listingId' })
  listingId!: string;

  @Index()
  @Column({ type: 'uuid' })
  publisherId!: string;

  /** Globally-unique scoped name, e.g. `@acme/crm`. */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  scopedName!: string;

  /** Unscoped module id within the publisher namespace. */
  @Column({ type: 'varchar' })
  moduleId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  icon!: string | null;

  @Column({ type: 'varchar', nullable: true })
  tier!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  repoUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  homepage!: string | null;

  @Column({ type: 'varchar', default: 'private' })
  visibility!: ListingVisibility;

  @Index()
  @Column({ type: 'varchar', default: 'draft' })
  status!: ListingStatus;

  @Column({ type: 'uuid', nullable: true })
  currentVersionId!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
