import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { Message as MessageEntity } from './entities/message.entity';
import type { MessageModerationStatus } from './messaging.enums';
import { publishRealtime } from './messaging.realtime';
import type { AiClassifyResult } from './messaging.moderation.ai';
import type { ModerationJob } from './messaging.moderation.queue';
import type { ModerationPolicy } from './messaging.moderation.types';
import { loadPolicy } from './messaging.moderation.policy';
import { publishApproved } from './messaging.moderation.actions';
import { auditModeration, emitEvent, notifyModerators } from './messaging.moderation.effects';

export async function runAiJob(job: ModerationJob): Promise<void> {
  const policy = await loadPolicy(job.tenantId);
  if (!policy.useAi) {
    // AI was turned off after enqueue — release any held message.
    if (job.held) await releaseHeld(job.tenantId, job.messageId);
    return;
  }
  const { classifyMessage } = await import('./messaging.moderation.ai');
  const ai = await classifyMessage(job.tenantId, job.body);
  await applyAiResult(job.tenantId, job.messageId, ai, policy, job.held);
}

export async function applyAiResult(
  tenantId: string,
  messageId: string,
  ai: AiClassifyResult,
  policy: ModerationPolicy,
  wasHeld: boolean,
): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(MessageEntity);
  const msg = await repo.findOne({ where: { tenantId, messageId } });
  if (!msg) return;

  const violates = ai.flagged && ai.score >= policy.aiThreshold;
  msg.moderationScore = ai.score;
  if (ai.categories.length) msg.moderationLabels = ai.categories;

  if (violates) {
    // Quarantine: REJECTED if it was held; HIDDEN if already delivered.
    msg.moderationStatus = wasHeld ? 'REJECTED' : 'HIDDEN';
    msg.moderationReason = 'ai';
    msg.moderatedAt = new Date();
    await repo.save(msg);

    await publishRealtime({
      kind: 'message:moderated',
      tenantId,
      conversationId: msg.conversationId,
      messageId,
      status: msg.moderationStatus as MessageModerationStatus,
    });
    if (!wasHeld) {
      await publishRealtime({ kind: 'message:deleted', tenantId, conversationId: msg.conversationId, messageId });
    }
    auditModeration(tenantId, null, 'message.moderated', messageId, 'high', { by: 'ai', score: ai.score, categories: ai.categories });
    emitEvent(tenantId, 'message.moderated', { conversationId: msg.conversationId, messageId, status: msg.moderationStatus, by: 'ai' });
    notifyModerators(tenantId, 'Message auto-moderated', 'AI flagged and removed a message.');
    return;
  }

  // Cleared. If it was held, deliver it now (late).
  if (wasHeld) {
    await publishApproved(ds, tenantId, msg);
  } else {
    await repo.save(msg); // persist score enrichment only
  }
}

/** Fail-open: release a stuck held message (worker exhausted retries). */
export async function releaseHeld(tenantId: string, messageId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(MessageEntity);
  const msg = await repo.findOne({ where: { tenantId, messageId } });
  if (!msg || msg.moderationStatus !== 'PENDING') return;
  await publishApproved(ds, tenantId, msg);
}
