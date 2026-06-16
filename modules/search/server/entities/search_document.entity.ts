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
 * A tenant-scoped, indexed document in the search index. Owning modules push one
 * row per searchable source record (a blog post, a product, a doc page, …),
 * identified by `(entityType, entityId)`. Re-indexing the same source upserts on
 * the `(tenantId, entityType, entityId)` unique key.
 *
 * The PostgreSQL FTS provider builds a `tsvector` from `coalesce(title,'') || ' '
 * || coalesce(body,'')` at query time using the row's `language` text-search
 * config. See {@link PostgresSearchProvider}.
 */
@Entity('search_documents')
@Unique('uq_search_doc', ['tenantId', 'entityType', 'entityId'])
export class SearchDocument {
  @PrimaryGeneratedColumn('uuid', { name: 'docId' })
  docId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // The kind of source record this document represents (e.g. 'blog_post').
  @Index()
  @Column({ type: 'varchar' })
  entityType!: string;

  // The source record's id within its module. Stored as varchar to accept uuid
  // or numeric/string keys alike.
  @Column({ type: 'varchar' })
  entityId!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  // Where the source record can be viewed; surfaced as the hit link.
  @Column({ type: 'varchar', nullable: true })
  url!: string | null;

  // Arbitrary owner-supplied metadata returned verbatim with each hit.
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  // PostgreSQL text-search configuration name (a `regconfig`, e.g. 'english').
  @Column({ type: 'varchar', default: 'english' })
  language!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
