import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Immutable content snapshot of a DynamicPage, captured on each update for an
 * audit trail + rollback (version history). Stores the full content payload at
 * the time of the revision.
 */
@Entity('dynamic_page_versions')
export class DynamicPageVersion {
  @PrimaryGeneratedColumn('uuid', { name: 'versionId' })
  versionId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  dynamicPageId!: string;

  @Column({ type: 'int' })
  revision!: number;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'jsonb', default: '[]' })
  sections!: object;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: object;

  @Column({ type: 'varchar' })
  status!: string;

  /** Who made the change (actor user id), when known. */
  @Column({ nullable: true, type: 'uuid' })
  changedByUserId?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
