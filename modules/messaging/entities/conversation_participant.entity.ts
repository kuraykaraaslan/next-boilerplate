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
 * Membership of a user in a conversation, with a conversation-scoped role
 * (`owner` | `admin` | `member`) independent of the tenant-level role.
 *
 * Read/delivery receipts are stored here as cheap cursors (watermarks) instead
 * of a per-message-per-user table: `lastReadMessageId` is "up to which message
 * has this user read", and read/delivery status of any message is derived from
 * these cursors. `markRead` is therefore a single UPDATE regardless of how many
 * messages are caught up.
 */
@Entity('conversation_participants')
@Index('uq_participant_conversation_user', ['tenantId', 'conversationId', 'userId'], { unique: true })
@Index('idx_participant_tenant_user', ['tenantId', 'userId'])
export class ConversationParticipant {
  @PrimaryGeneratedColumn('uuid', { name: 'participantId' })
  participantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid' })
  conversationId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  // 'owner' | 'admin' | 'member'
  @Column({ type: 'varchar', length: 16, default: 'member' })
  role!: string;

  // Read cursor: last message this user has read in this conversation.
  @Column({ type: 'uuid', nullable: true })
  lastReadMessageId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastReadAt!: Date | null;

  // Delivery cursor: last message confirmed delivered to one of this user's devices.
  @Column({ type: 'uuid', nullable: true })
  lastDeliveredMessageId!: string | null;

  // Optional per-user mute window for this conversation.
  @Column({ type: 'timestamp', nullable: true })
  mutedUntil!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  joinedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  // Soft-leave: a user who left/was removed keeps history but stops receiving.
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
