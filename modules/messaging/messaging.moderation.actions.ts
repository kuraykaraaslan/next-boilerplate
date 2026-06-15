import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { Message as MessageEntity } from './entities/message.entity';
import { Conversation as ConversationEntity } from './entities/conversation.entity';
import { MessageReport as MessageReportEntity } from './entities/message_report.entity';
import { SafeMessageSchema, type SafeMessage } from './messaging.types';
import type { ModerationMode, ModerationAction } from './messaging.enums';
import MessagingMessages from './messaging.messages';
import { publishRealtime } from './messaging.realtime';
import type { ModerateMessageInput } from './messaging.dto';
import type { PolicyDecision } from './messaging.moderation.types';
import { auditModeration, emitEvent, notifyModerators } from './messaging.moderation.effects';

// ─── Violation side effects (called from sendMessage) ─────────────────────────

export async function onViolation(
  tenantId: string,
  msg: SafeMessage,
  decision: PolicyDecision,
  mode: ModerationMode,
): Promise<void> {
  auditModeration(tenantId, null, 'message.flagged', msg.messageId, 'high', {
    conversationId: msg.conversationId,
    status: decision.status,
    reason: decision.reason,
    labels: msg.moderationLabels,
  });
  emitEvent(tenantId, 'message.flagged', {
    conversationId: msg.conversationId,
    messageId: msg.messageId,
    status: decision.status,
    reason: decision.reason,
  });
  if (mode === 'REPORT' || mode === 'AUTO') {
    notifyModerators(
      tenantId,
      decision.held ? 'Message quarantined' : 'Message flagged',
      `A message in a conversation was ${decision.held ? 'held for review' : 'flagged'}.`,
    );
  }
}

// ─── Manual moderation ────────────────────────────────────────────────────────

export async function moderate(
  tenantId: string,
  actorUserId: string,
  messageId: string,
  input: ModerateMessageInput,
): Promise<SafeMessage> {
  switch (input.action) {
    case 'approve':
      return approve(tenantId, actorUserId, messageId);
    case 'reject':
      return reject(tenantId, actorUserId, messageId, input.note);
    case 'hide':
      return hide(tenantId, actorUserId, messageId, input.note);
    case 'dismiss':
      // Dismiss reports without changing message state.
      await resolveReports(tenantId, actorUserId, messageId, 'dismiss', 'DISMISSED');
      return getMessage(tenantId, messageId);
    default:
      throw new AppError(MessagingMessages.INVALID_MODERATION_ACTION, 400, ErrorCode.VALIDATION_ERROR);
  }
}

export async function approve(tenantId: string, actorUserId: string | null, messageId: string): Promise<SafeMessage> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(MessageEntity);
  const msg = await repo.findOne({ where: { tenantId, messageId } });
  if (!msg) throw new AppError(MessagingMessages.MESSAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const wasHeld = msg.moderationStatus === 'PENDING';
  const safe = await publishApproved(ds, tenantId, msg, actorUserId, !wasHeld);
  await resolveReports(tenantId, actorUserId, messageId, 'approve', 'RESOLVED');
  auditModeration(tenantId, actorUserId, 'message.moderated', messageId, 'high', { action: 'approve' });
  emitEvent(tenantId, 'message.moderated', { conversationId: msg.conversationId, messageId, status: 'APPROVED' });
  return safe;
}

export async function reject(tenantId: string, actorUserId: string | null, messageId: string, note?: string): Promise<SafeMessage> {
  return setRemoved(tenantId, actorUserId, messageId, 'REJECTED', note);
}

export async function hide(tenantId: string, actorUserId: string | null, messageId: string, note?: string): Promise<SafeMessage> {
  return setRemoved(tenantId, actorUserId, messageId, 'HIDDEN', note);
}

async function setRemoved(
  tenantId: string,
  actorUserId: string | null,
  messageId: string,
  status: 'REJECTED' | 'HIDDEN',
  note?: string,
): Promise<SafeMessage> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(MessageEntity);
  const msg = await repo.findOne({ where: { tenantId, messageId } });
  if (!msg) throw new AppError(MessagingMessages.MESSAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const wasVisible = ['CLEAN', 'FLAGGED', 'APPROVED'].includes(msg.moderationStatus);
  msg.moderationStatus = status;
  msg.moderationReason = 'manual';
  msg.moderatedByUserId = actorUserId;
  msg.moderatedAt = new Date();
  if (note) msg.metadata = { ...(msg.metadata as Record<string, unknown> | null), moderationNote: note };
  const saved = await repo.save(msg);

  await publishRealtime({ kind: 'message:moderated', tenantId, conversationId: msg.conversationId, messageId, status });
  // If recipients had already rendered it, tell them to drop it.
  if (wasVisible) {
    await publishRealtime({ kind: 'message:deleted', tenantId, conversationId: msg.conversationId, messageId });
  }
  await resolveReports(tenantId, actorUserId, messageId, status === 'REJECTED' ? 'reject' : 'hide', 'RESOLVED');
  auditModeration(tenantId, actorUserId, 'message.moderated', messageId, 'high', { action: status.toLowerCase(), note });
  emitEvent(tenantId, 'message.moderated', { conversationId: msg.conversationId, messageId, status });
  return SafeMessageSchema.parse(saved);
}

/** Mark a message APPROVED and (re)deliver it. Restores conversation preview when it was held. */
export async function publishApproved(
  ds: Awaited<ReturnType<typeof tenantDataSourceFor>>,
  tenantId: string,
  msg: MessageEntity,
  actorUserId: string | null = null,
  alreadyDelivered = false,
): Promise<SafeMessage> {
  const wasHeld = msg.moderationStatus === 'PENDING';
  msg.moderationStatus = 'APPROVED';
  msg.moderatedByUserId = actorUserId;
  msg.moderatedAt = new Date();
  const saved = await ds.getRepository(MessageEntity).save(msg);
  const safe = SafeMessageSchema.parse(saved);

  if (wasHeld) {
    // Restore denormalized last-message and deliver late to the whole room.
    await ds.getRepository(ConversationEntity).update(
      { tenantId, conversationId: msg.conversationId },
      { lastMessageAt: msg.createdAt, lastMessagePreview: (msg.body ?? '').slice(0, 280) },
    );
    await publishRealtime({ kind: 'message:new', tenantId, conversationId: msg.conversationId, message: safe });
  } else if (!alreadyDelivered) {
    await publishRealtime({ kind: 'message:moderated', tenantId, conversationId: msg.conversationId, messageId: msg.messageId, status: 'APPROVED' });
  }
  return safe;
}

export async function resolveReports(
  tenantId: string,
  actorUserId: string | null,
  messageId: string,
  action: ModerationAction,
  status: 'RESOLVED' | 'DISMISSED',
): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  await ds.getRepository(MessageReportEntity).update(
    { tenantId, messageId, status: In(['OPEN', 'REVIEWING']) },
    { status, resolvedByUserId: actorUserId, resolutionAction: action, resolvedAt: new Date() },
  );
}

export async function getMessage(tenantId: string, messageId: string): Promise<SafeMessage> {
  const ds = await tenantDataSourceFor(tenantId);
  const msg = await ds.getRepository(MessageEntity).findOne({ where: { tenantId, messageId } });
  if (!msg) throw new AppError(MessagingMessages.MESSAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  return SafeMessageSchema.parse(msg);
}
