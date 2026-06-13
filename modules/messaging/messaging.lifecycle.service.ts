import 'reflect-metadata';
import { IsNull, In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { Conversation as ConversationEntity } from './entities/conversation.entity';
import { ConversationParticipant as ParticipantEntity } from './entities/conversation_participant.entity';
import { Message as MessageEntity } from './entities/message.entity';
import { SafeMessageSchema, type SafeMessage } from './messaging.types';
import type { SendMessageInput, MarkReadInput } from './messaging.dto';
import MessagingMessages from './messaging.messages';
import MessagingPolicyService from './messaging.policy.service';
import MessagingModerationService from './messaging.moderation.service';
import { enqueue as enqueueModeration } from './messaging.moderation.queue';
import { publishRealtime } from './messaging.realtime';

/** Build a short plain-text preview for the conversation list. */
function previewOf(input: SendMessageInput): string {
  if (input.contentType === 'text') return input.body.slice(0, 280);
  const label = input.contentType === 'image' ? '📷 Image' : input.contentType === 'file' ? '📎 File' : input.body;
  return label.slice(0, 280);
}

/** Best-effort webhook dispatch — never let billing/webhook failure break a send. */
function emitMessagingEvent(tenantId: string, event: string, payload: Record<string, unknown>): void {
  import('@/modules/webhook/webhook.service')
    .then((m) => m.default.dispatchEvent(tenantId, event as never, payload))
    .catch(() => {});
}

/**
 * Write-side flows for messaging: sending messages, advancing read/delivery
 * cursors, and soft-deleting. Each write persists first, then publishes a
 * realtime event to the WS cluster (best-effort) and dispatches a webhook.
 */
export default class MessagingLifecycleService {
  static async sendMessage(
    tenantId: string,
    senderUserId: string,
    conversationId: string,
    input: SendMessageInput,
  ): Promise<SafeMessage> {
    await MessagingPolicyService.assertParticipant(tenantId, senderUserId, conversationId);
    const ds = await tenantDataSourceFor(tenantId);

    // ── Moderation gate ──────────────────────────────────────────────────────
    // Keyword scan is synchronous + deterministic and decides delivery BEFORE
    // the message goes out. The AI backstop (if enabled) runs async afterward.
    const policy = await MessagingModerationService.loadPolicy(tenantId);
    const scan =
      policy.mode === 'OFF'
        ? { flagged: false, matched: [] as string[] }
        : MessagingModerationService.scanText(input.body, policy.keywords);
    const decision = MessagingModerationService.applyPolicy(policy.mode, scan, {
      useAi: policy.useAi,
      aiHold: policy.aiHold,
      aiAvailable: process.env.ENABLE_BACKGROUND_JOBS === 'true',
    });

    const saved = await ds.transaction(async (mgr) => {
      const msg = await mgr.getRepository(MessageEntity).save(
        mgr.getRepository(MessageEntity).create({
          tenantId,
          conversationId,
          senderUserId,
          body: input.body,
          contentType: input.contentType,
          attachments: input.attachments ?? null,
          replyToMessageId: input.replyToMessageId ?? null,
          moderationStatus: decision.status,
          moderationReason: decision.reason,
          moderationLabels: scan.matched.length ? scan.matched : null,
        }),
      );

      // Denormalize last-message fields ONLY for delivered messages — a held
      // (quarantined) message must not leak its content into the preview.
      if (!decision.held) {
        await mgr.getRepository(ConversationEntity).update(
          { tenantId, conversationId },
          { lastMessageAt: msg.createdAt, lastMessagePreview: previewOf(input) },
        );
      }

      // The sender has implicitly read + received their own message.
      await mgr.getRepository(ParticipantEntity).update(
        { tenantId, conversationId, userId: senderUserId },
        { lastReadMessageId: msg.messageId, lastReadAt: msg.createdAt, lastDeliveredMessageId: msg.messageId },
      );

      return msg;
    });

    const safe = SafeMessageSchema.parse(saved);

    // ── Conditional delivery ──────────────────────────────────────────────────
    if (!decision.held) {
      await publishRealtime({
        kind: 'message:new',
        tenantId,
        conversationId,
        clientNonce: input.clientNonce,
        message: safe,
      });
      emitMessagingEvent(tenantId, 'message.created', { conversationId, messageId: safe.messageId, senderUserId });
    } else {
      // Quarantined — notify the SENDER ONLY so their optimistic UI can mark "pending review".
      await publishRealtime({
        kind: 'message:moderated',
        tenantId,
        conversationId,
        messageId: safe.messageId,
        status: 'PENDING',
        forUserId: senderUserId,
      });
    }

    // Violation side effects (audit/webhook/notify) — best-effort, never block.
    if (decision.status === 'FLAGGED' || decision.held) {
      MessagingModerationService.onViolation(tenantId, safe, decision, policy.mode).catch(() => {});
    }

    // Async AI backstop.
    if (decision.runAi) {
      await enqueueModeration({
        tenantId,
        conversationId,
        messageId: safe.messageId,
        body: input.body,
        mode: policy.mode,
        held: decision.held,
      }).catch(() => {});
    }

    return safe;
  }

  static async markRead(
    tenantId: string,
    userId: string,
    conversationId: string,
    input: MarkReadInput,
  ): Promise<{ lastReadMessageId: string; lastReadAt: Date }> {
    await MessagingPolicyService.assertParticipant(tenantId, userId, conversationId);
    const ds = await tenantDataSourceFor(tenantId);

    // Anchor the read time to the target message's own timestamp.
    const target = await ds.getRepository(MessageEntity).findOne({
      where: { tenantId, conversationId, messageId: input.upToMessageId },
      select: { createdAt: true },
    });
    if (!target) throw new AppError(MessagingMessages.MESSAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const readAt = target.createdAt;
    await ds.getRepository(ParticipantEntity).update(
      { tenantId, conversationId, userId },
      { lastReadMessageId: input.upToMessageId, lastReadAt: readAt, lastDeliveredMessageId: input.upToMessageId },
    );

    await publishRealtime({ kind: 'read', tenantId, conversationId, userId, upToMessageId: input.upToMessageId });
    return { lastReadMessageId: input.upToMessageId, lastReadAt: readAt };
  }

  /** Advance the delivery cursor (typically called by the WS server on receipt). */
  static async markDelivered(
    tenantId: string,
    userId: string,
    conversationId: string,
    upToMessageId: string,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(ParticipantEntity).update(
      { tenantId, conversationId, userId, deletedAt: IsNull() },
      { lastDeliveredMessageId: upToMessageId },
    );
  }

  static async deleteMessage(
    tenantId: string,
    actorUserId: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MessageEntity);
    const msg = await repo.findOne({ where: { tenantId, conversationId, messageId } });
    if (!msg) throw new AppError(MessagingMessages.MESSAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    await MessagingPolicyService.assertCanDeleteMessage(tenantId, actorUserId, conversationId, msg);
    await repo.softRemove(msg);

    await publishRealtime({ kind: 'message:deleted', tenantId, conversationId, messageId });
    emitMessagingEvent(tenantId, 'message.deleted', { conversationId, messageId, actorUserId });
  }

  /**
   * Derive who a message has been delivered to / read by, from participant
   * cursors. Cheap O(participants) read; no per-message receipt rows.
   */
  static async getReadStatus(
    tenantId: string,
    conversationId: string,
    messageId: string,
  ): Promise<{ deliveredTo: string[]; readBy: string[] }> {
    const ds = await tenantDataSourceFor(tenantId);
    const target = await ds.getRepository(MessageEntity).findOne({
      where: { tenantId, conversationId, messageId },
      select: { createdAt: true },
    });
    if (!target) throw new AppError(MessagingMessages.MESSAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const participants = await ds.getRepository(ParticipantEntity).find({
      where: { tenantId, conversationId, deletedAt: IsNull() },
    });

    // Resolve the timestamps of each participant's delivery cursor in one query.
    const deliveredIds = participants
      .map((p) => p.lastDeliveredMessageId)
      .filter((id): id is string => !!id);
    const deliveredAtById = new Map<string, Date>();
    if (deliveredIds.length > 0) {
      const cursorMsgs = await ds.getRepository(MessageEntity).find({
        where: { tenantId, conversationId, messageId: In(deliveredIds) },
        select: { messageId: true, createdAt: true },
      });
      for (const m of cursorMsgs) deliveredAtById.set(m.messageId, m.createdAt);
    }

    const deliveredTo: string[] = [];
    const readBy: string[] = [];
    for (const p of participants) {
      if (p.lastReadAt && p.lastReadAt >= target.createdAt) readBy.push(p.userId);
      const deliveredAt = p.lastDeliveredMessageId ? deliveredAtById.get(p.lastDeliveredMessageId) : undefined;
      if (deliveredAt && deliveredAt >= target.createdAt) deliveredTo.push(p.userId);
    }
    return { deliveredTo, readBy };
  }
}
