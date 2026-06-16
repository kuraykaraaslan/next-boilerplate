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

export interface MessageAttachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

/**
 * A single persisted message in a conversation.
 *
 * Listing uses keyset (cursor) pagination ordered by `(createdAt DESC,
 * messageId DESC)`; the composite index `(tenantId, conversationId, createdAt)`
 * backs that hot path. Soft-deleted messages are excluded by TypeORM default.
 */
@Entity('messages')
@Index('idx_message_tenant_conversation_created', ['tenantId', 'conversationId', 'createdAt'])
@Index('idx_message_moderation_status', ['tenantId', 'conversationId', 'moderationStatus'])
@Index('idx_message_mod_queue', ['tenantId', 'moderationStatus', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid', { name: 'messageId' })
  messageId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  conversationId!: string;

  @Index()
  @Column({ type: 'uuid' })
  senderUserId!: string;

  @Column({ type: 'text' })
  body!: string;

  // 'text' | 'image' | 'file' | 'system'
  @Column({ type: 'varchar', length: 16, default: 'text' })
  contentType!: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments!: MessageAttachment[] | null;

  // Threaded reply target (optional).
  @Column({ type: 'uuid', nullable: true })
  replyToMessageId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'timestamp', nullable: true })
  editedAt!: Date | null;

  // ─── Moderation ────────────────────────────────────────────────────────────
  // See MessageModerationStatusEnum. Visibility is derived from this: CLEAN /
  // FLAGGED / APPROVED reach recipients; PENDING / REJECTED / HIDDEN do not.
  @Column({ type: 'varchar', length: 16, default: 'CLEAN' })
  moderationStatus!: string;

  // What produced the decision: 'keyword' | 'ai' | 'report' | 'manual'.
  @Column({ type: 'varchar', length: 32, nullable: true })
  moderationReason!: string | null;

  // AI confidence 0–100 (null unless the AI backstop ran).
  @Column({ type: 'smallint', nullable: true })
  moderationScore!: number | null;

  // Matched keywords or AI category labels.
  @Column({ type: 'jsonb', nullable: true })
  moderationLabels!: string[] | null;

  @Column({ type: 'uuid', nullable: true })
  moderatedByUserId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  moderatedAt!: Date | null;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
