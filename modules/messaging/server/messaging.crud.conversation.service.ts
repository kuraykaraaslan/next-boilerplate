import 'reflect-metadata';
import { IsNull, type DataSource } from 'typeorm';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { Conversation as ConversationEntity } from './entities/conversation.entity';
import { ConversationParticipant as ParticipantEntity } from './entities/conversation_participant.entity';
import { Message as MessageEntity } from './entities/message.entity';
import {
  SafeConversationSchema,
  SafeConversationDetailSchema,
  SafeConversationSummarySchema,
  SafeParticipantSchema,
  type SafeConversation,
  type SafeConversationDetail,
  type SafeConversationSummary,
} from './messaging.types';
import type { CreateConversationInput, ListConversationsInput } from './messaging.dto';
import MessagingMessages from './messaging.messages';
import MessagingPolicyService from './messaging.policy.service';
import { encodeCursor, decodeCursor, directDedupeKey } from './messaging.crud.cursor';

export async function createConversation(
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

    return createConversationTx(ds, tenantId, {
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
  return createConversationTx(ds, tenantId, {
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
async function createConversationTx(
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

export async function listConversations(
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
      const unreadCount = await unreadCountFor(ds, tenantId, c.conversationId, userId);
      return SafeConversationSummarySchema.parse({ ...c, unreadCount });
    }),
  );

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(last.lastMessageAt ?? last.createdAt, last.conversationId) : null;
  return { conversations, nextCursor };
}

/** Count messages newer than the caller's read cursor (excluding their own). */
async function unreadCountFor(
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

export async function getConversation(
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
