import 'reflect-metadata';
import { IsNull, type DataSource } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { Conversation as ConversationEntity } from './entities/conversation.entity';
import { ConversationParticipant as ParticipantEntity } from './entities/conversation_participant.entity';
import { Message as MessageEntity } from './entities/message.entity';
import {
  SafeConversationSchema,
  SafeConversationDetailSchema,
  SafeConversationSummarySchema,
  SafeParticipantSchema,
  SafeMessageSchema,
  type SafeConversation,
  type SafeConversationDetail,
  type SafeConversationSummary,
  type SafeParticipant,
  type SafeMessage,
} from './messaging.types';
import type {
  CreateConversationInput,
  ListConversationsInput,
  ListMessagesInput,
  AddParticipantInput,
} from './messaging.dto';
import MessagingMessages from './messaging.messages';
import MessagingPolicyService from './messaging.policy.service';

// ─── Cursor helpers (keyset pagination over createdAt + id) ──────────────────

interface Cursor {
  createdAt: string; // ISO
  id: string;
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(raw: string): Cursor {
  try {
    const [createdAt, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
    if (!createdAt || !id) throw new Error('malformed');
    return { createdAt, id };
  } catch {
    throw new AppError(MessagingMessages.INVALID_CURSOR, 400, ErrorCode.VALIDATION_ERROR);
  }
}

function directDedupeKey(userA: string, userB: string): string {
  return `dm:${[userA, userB].sort().join(':')}`;
}

/**
 * Persistence for conversations, participants and messages. Tenant-isolated:
 * every query filters by `tenantId` via the per-tenant DataSource. Authorization
 * is delegated to {@link MessagingPolicyService}.
 */
export default class MessagingCrudService {
  // ─── Conversations ──────────────────────────────────────────────────────────

  static async createConversation(
    tenantId: string,
    actorUserId: string,
    input: CreateConversationInput,
  ): Promise<SafeConversation> {
    const ds = await tenantDataSourceFor(tenantId);

    if (input.type === 'direct') {
      const peerUserId = input.participantUserIds[0];
      const dedupeKey = directDedupeKey(actorUserId, peerUserId);

      // Return the existing direct thread if one already exists (idempotent).
      const existing = await ds.getRepository(ConversationEntity).findOne({
        where: { tenantId, dedupeKey, deletedAt: IsNull() },
      });
      if (existing) return SafeConversationSchema.parse(existing);

      return this.createConversationTx(ds, tenantId, {
        type: 'direct',
        title: null,
        dedupeKey,
        createdByUserId: actorUserId,
        metadata: input.metadata ?? null,
        members: [
          { userId: actorUserId, role: 'owner' },
          { userId: peerUserId, role: 'member' },
        ],
      });
    }

    // group — actor is owner, the rest are members (deduped, actor excluded).
    const memberIds = Array.from(new Set(input.participantUserIds)).filter((id) => id !== actorUserId);
    return this.createConversationTx(ds, tenantId, {
      type: 'group',
      title: input.title ?? null,
      dedupeKey: null,
      createdByUserId: actorUserId,
      metadata: input.metadata ?? null,
      members: [
        { userId: actorUserId, role: 'owner' },
        ...memberIds.map((userId) => ({ userId, role: 'member' as const })),
      ],
    });
  }

  /** Insert a conversation + its participants atomically. */
  private static async createConversationTx(
    ds: DataSource,
    tenantId: string,
    data: {
      type: 'direct' | 'group';
      title: string | null;
      dedupeKey: string | null;
      createdByUserId: string;
      metadata: Record<string, unknown> | null;
      members: { userId: string; role: 'owner' | 'admin' | 'member' }[];
    },
  ): Promise<SafeConversation> {
    return ds.transaction(async (mgr) => {
      const conv = await mgr.getRepository(ConversationEntity).save(
        mgr.getRepository(ConversationEntity).create({
          tenantId,
          type: data.type,
          title: data.title,
          dedupeKey: data.dedupeKey,
          createdByUserId: data.createdByUserId,
          metadata: data.metadata,
        }),
      );
      await mgr.getRepository(ParticipantEntity).save(
        data.members.map((m) =>
          mgr.getRepository(ParticipantEntity).create({
            tenantId,
            conversationId: conv.conversationId,
            userId: m.userId,
            role: m.role,
          }),
        ),
      );
      return SafeConversationSchema.parse(conv);
    });
  }

  static async listConversations(
    tenantId: string,
    userId: string,
    input: ListConversationsInput,
  ): Promise<{ conversations: SafeConversationSummary[]; nextCursor: string | null }> {
    const ds = await tenantDataSourceFor(tenantId);

    // Conversations where the caller is an active participant, newest activity first.
    const qb = ds
      .getRepository(ConversationEntity)
      .createQueryBuilder('c')
      .innerJoin(
        ParticipantEntity,
        'p',
        'p.conversationId = c.conversationId AND p.userId = :userId AND p.deletedAt IS NULL',
        { userId },
      )
      .where('c.tenantId = :tenantId', { tenantId })
      .orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('c.conversationId', 'DESC')
      .take(input.limit + 1);

    if (input.cursor) {
      const cur = decodeCursor(input.cursor);
      qb.andWhere(
        '(c.lastMessageAt < :cAt OR (c.lastMessageAt = :cAt AND c.conversationId < :cId))',
        { cAt: cur.createdAt, cId: cur.id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;

    const conversations = await Promise.all(
      page.map(async (c) => {
        const unreadCount = await this.unreadCountFor(ds, tenantId, c.conversationId, userId);
        return SafeConversationSummarySchema.parse({ ...c, unreadCount });
      }),
    );

    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor(last.lastMessageAt ?? last.createdAt, last.conversationId) : null;
    return { conversations, nextCursor };
  }

  /** Count messages newer than the caller's read cursor (excluding their own). */
  private static async unreadCountFor(
    ds: DataSource,
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<number> {
    const participant = await ds.getRepository(ParticipantEntity).findOne({
      where: { tenantId, conversationId, userId, deletedAt: IsNull() },
      select: { lastReadAt: true },
    });
    const qb = ds
      .getRepository(MessageEntity)
      .createQueryBuilder('m')
      .where('m.tenantId = :tenantId', { tenantId })
      .andWhere('m.conversationId = :conversationId', { conversationId })
      .andWhere('m.senderUserId != :userId', { userId });
    if (participant?.lastReadAt) {
      qb.andWhere('m.createdAt > :since', { since: participant.lastReadAt });
    }
    return qb.getCount();
  }

  static async getConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
  ): Promise<SafeConversationDetail> {
    await MessagingPolicyService.assertParticipant(tenantId, userId, conversationId);
    const ds = await tenantDataSourceFor(tenantId);
    const conv = await ds.getRepository(ConversationEntity).findOne({ where: { tenantId, conversationId } });
    if (!conv) throw new AppError(MessagingMessages.CONVERSATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const participants = await ds.getRepository(ParticipantEntity).find({
      where: { tenantId, conversationId, deletedAt: IsNull() },
      order: { joinedAt: 'ASC' },
    });
    return SafeConversationDetailSchema.parse({
      ...conv,
      participants: participants.map((p) => SafeParticipantSchema.parse(p)),
    });
  }

  // ─── Participants ─────────────────────────────────────────────────────────────

  static async addParticipant(
    tenantId: string,
    actorUserId: string,
    conversationId: string,
    input: AddParticipantInput,
  ): Promise<SafeParticipant> {
    await MessagingPolicyService.assertCanManageParticipants(tenantId, actorUserId, conversationId);
    const ds = await tenantDataSourceFor(tenantId);

    const conv = await ds.getRepository(ConversationEntity).findOne({ where: { tenantId, conversationId } });
    if (!conv) throw new AppError(MessagingMessages.CONVERSATION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (conv.type === 'direct') {
      throw new AppError(MessagingMessages.CANNOT_ADD_TO_DIRECT, 400, ErrorCode.VALIDATION_ERROR);
    }

    const repo = ds.getRepository(ParticipantEntity);
    const existing = await repo.findOne({ where: { tenantId, conversationId, userId: input.userId } });
    if (existing && !existing.deletedAt) {
      throw new AppError(MessagingMessages.ALREADY_PARTICIPANT, 409, ErrorCode.CONFLICT);
    }
    if (existing && existing.deletedAt) {
      // Re-join: revive the soft-left row.
      existing.deletedAt = null;
      existing.role = input.role;
      const revived = await repo.save(existing);
      return SafeParticipantSchema.parse(revived);
    }

    const saved = await repo.save(
      repo.create({ tenantId, conversationId, userId: input.userId, role: input.role }),
    );
    return SafeParticipantSchema.parse(saved);
  }

  static async removeParticipant(
    tenantId: string,
    actorUserId: string,
    conversationId: string,
    targetUserId: string,
  ): Promise<void> {
    // A user may always remove themselves (leave); otherwise admin/owner required.
    if (targetUserId !== actorUserId) {
      await MessagingPolicyService.assertCanManageParticipants(tenantId, actorUserId, conversationId);
    } else {
      await MessagingPolicyService.assertParticipant(tenantId, actorUserId, conversationId);
    }
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ParticipantEntity);

    const target = await repo.findOne({
      where: { tenantId, conversationId, userId: targetUserId, deletedAt: IsNull() },
    });
    if (!target) throw new AppError(MessagingMessages.NOT_PARTICIPANT, 404, ErrorCode.NOT_FOUND);

    // Never strand a conversation without an owner.
    if (target.role === 'owner') {
      const owners = await repo.count({
        where: { tenantId, conversationId, role: 'owner', deletedAt: IsNull() },
      });
      if (owners <= 1) {
        throw new AppError(MessagingMessages.CANNOT_REMOVE_LAST_OWNER, 400, ErrorCode.VALIDATION_ERROR);
      }
    }
    await repo.softRemove(target);
  }

  // ─── Messages (read paths; writes live in the lifecycle service) ─────────────

  static async listMessages(
    tenantId: string,
    userId: string,
    conversationId: string,
    input: ListMessagesInput,
    isAdmin = false,
  ): Promise<{ messages: SafeMessage[]; nextCursor: string | null }> {
    await MessagingPolicyService.assertParticipant(tenantId, userId, conversationId);
    const ds = await tenantDataSourceFor(tenantId);

    const qb = ds
      .getRepository(MessageEntity)
      .createQueryBuilder('m')
      .where('m.tenantId = :tenantId', { tenantId })
      .andWhere('m.conversationId = :conversationId', { conversationId })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.messageId', 'DESC')
      .take(input.limit + 1);

    // Hide non-visible moderation statuses from recipients. The sender always
    // sees their own messages (with the status marker); admins see everything.
    if (!isAdmin) {
      qb.andWhere(
        '(m.moderationStatus IN (:...visible) OR m.senderUserId = :uid)',
        { visible: ['CLEAN', 'FLAGGED', 'APPROVED'], uid: userId },
      );
    }

    if (input.cursor) {
      const cur = decodeCursor(input.cursor);
      qb.andWhere(
        '(m.createdAt < :cAt OR (m.createdAt = :cAt AND m.messageId < :cId))',
        { cAt: cur.createdAt, cId: cur.id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.messageId) : null;
    return { messages: page.map((m) => SafeMessageSchema.parse(m)), nextCursor };
  }
}
