import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/**
 * A messaging conversation — either a 1-1 `direct` thread or a `group` thread.
 *
 * Tenant-scoped: every row carries `tenantId` and all queries filter by it.
 *
 * 1-1 dedupe: `direct` conversations set `dedupeKey = 'dm:' + [a,b].sort().join(':')`
 * and a partial-unique index `(tenantId, dedupeKey)` guarantees a single direct
 * thread per user pair per tenant. `group` conversations leave `dedupeKey` null.
 */
@Entity('conversations')
@Index('uq_conversation_dedupe', ['tenantId', 'dedupeKey'], {
  unique: true,
  where: '"dedupeKey" IS NOT NULL',
})
@Index('idx_conversation_tenant_last_message', ['tenantId', 'lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid', { name: 'conversationId' })
  conversationId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  // 'direct' | 'group'
  @Column({ type: 'varchar', length: 16 })
  type!: string;

  // Group title; null for direct conversations.
  @Column({ type: 'varchar', length: 200, nullable: true })
  title!: string | null;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  // Deterministic dedupe key for 1-1 threads ('dm:<userA>:<userB>' sorted). Null for groups.
  @Column({ type: 'varchar', length: 160, nullable: true })
  dedupeKey!: string | null;

  // Denormalized for fast conversation-list ordering + preview, updated on each send.
  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt!: Date | null;

  @Column({ type: 'varchar', length: 280, nullable: true })
  lastMessagePreview!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  // Soft archive/delete — TypeORM auto-filters `deletedAt IS NULL`.
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
