import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { Message as MessageEntity } from './entities/message.entity';
import { MessageReport as MessageReportEntity } from './entities/message_report.entity';
import {
  SafeMessageSchema, SafeMessageReportSchema,
  type SafeMessage, type SafeMessageReport,
} from './messaging.types';
import MessagingMessages from './messaging.messages';
import MessagingPolicyService from './messaging.policy.service';
import type { ReportMessageInput, ModerationQueueInput } from './messaging.dto';
import { loadPolicy } from './messaging.moderation.policy';
import { hide } from './messaging.moderation.actions';
import { auditModeration, emitEvent, notifyModerators } from './messaging.moderation.effects';

export async function createReport(
  tenantId: string,
  reporterUserId: string,
  conversationId: string,
  messageId: string,
  input: ReportMessageInput,
): Promise<SafeMessageReport> {
  await MessagingPolicyService.assertParticipant(tenantId, reporterUserId, conversationId);
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(MessageReportEntity);

  // Ensure the message exists in this conversation.
  const msg = await ds.getRepository(MessageEntity).findOne({ where: { tenantId, conversationId, messageId } });
  if (!msg) throw new AppError(MessagingMessages.MESSAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  // Idempotent per (message, reporter) — the unique index enforces it.
  const existing = await repo.findOne({ where: { tenantId, messageId, reporterUserId } });
  if (existing) return SafeMessageReportSchema.parse(existing);

  let saved: MessageReportEntity;
  try {
    saved = await repo.save(
      repo.create({ tenantId, conversationId, messageId, reporterUserId, reason: input.reason, note: input.note ?? null }),
    );
  } catch {
    // Race on the unique index — return the now-existing row.
    const row = await repo.findOne({ where: { tenantId, messageId, reporterUserId } });
    if (row) return SafeMessageReportSchema.parse(row);
    throw new AppError(MessagingMessages.REPORT_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }

  auditModeration(tenantId, reporterUserId, 'message.reported', messageId, 'medium', { conversationId, reason: input.reason });
  emitEvent(tenantId, 'message.reported', { conversationId, messageId, reporterUserId, reason: input.reason });
  notifyModerators(tenantId, 'Message reported', `A message was reported (${input.reason}).`);

  // Auto-quarantine after N distinct open reports.
  const policy = await loadPolicy(tenantId);
  if (policy.reportThreshold > 0) {
    const openReports = await repo.count({ where: { tenantId, messageId, status: 'OPEN' } });
    if (openReports >= policy.reportThreshold && !['REJECTED', 'HIDDEN', 'PENDING'].includes(msg.moderationStatus)) {
      await hide(tenantId, null, messageId).catch(() => {});
    }
  }

  return SafeMessageReportSchema.parse(saved);
}

export async function listQueue(
  tenantId: string,
  input: ModerationQueueInput,
): Promise<{ messages: SafeMessage[]; reports: SafeMessageReport[] }> {
  const ds = await tenantDataSourceFor(tenantId);
  const messages = await ds.getRepository(MessageEntity).find({
    where: { tenantId, moderationStatus: In(['FLAGGED', 'PENDING']) },
    order: { createdAt: 'DESC' },
    take: input.limit,
  });
  const reports = await ds.getRepository(MessageReportEntity).find({
    where: { tenantId, status: In(['OPEN', 'REVIEWING']) },
    order: { createdAt: 'DESC' },
    take: input.limit,
  });
  return {
    messages: messages.map((m) => SafeMessageSchema.parse(m)),
    reports: reports.map((r) => SafeMessageReportSchema.parse(r)),
  };
}
