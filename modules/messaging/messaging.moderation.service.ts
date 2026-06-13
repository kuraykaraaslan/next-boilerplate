import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import SettingService from '@/modules/setting/setting.service';
import { Message as MessageEntity } from './entities/message.entity';
import { Conversation as ConversationEntity } from './entities/conversation.entity';
import { MessageReport as MessageReportEntity } from './entities/message_report.entity';
import {
  SafeMessageSchema,
  SafeMessageReportSchema,
  type SafeMessage,
  type SafeMessageReport,
} from './messaging.types';
import {
  type ModerationMode,
  type MessageModerationStatus,
  type ModerationAction,
} from './messaging.enums';
import MessagingMessages from './messaging.messages';
import MessagingPolicyService from './messaging.policy.service';
import { publishRealtime } from './messaging.realtime';
import {
  MESSAGING_MODERATION_KEYS,
  MESSAGING_MODERATION_DEFAULTS,
} from './messaging.moderation.setting.keys';
import type { AiClassifyResult } from './messaging.moderation.ai';
import type { ModerationJob } from './messaging.moderation.queue';
import type { ReportMessageInput, ModerateMessageInput, ModerationQueueInput } from './messaging.dto';

// ─── Policy + scan shapes ─────────────────────────────────────────────────────

export interface CompiledKeywords {
  literals: string[]; // already lowercased
  regexes: RegExp[];
}

export interface ModerationPolicy {
  mode: ModerationMode;
  keywords: CompiledKeywords;
  useAi: boolean;
  aiHold: boolean;
  aiThreshold: number;
  reportThreshold: number;
}

export interface ScanResult {
  flagged: boolean;
  matched: string[];
}

export interface PolicyDecision {
  status: MessageModerationStatus;
  reason: string | null;
  held: boolean;
  runAi: boolean;
}

/** Best-effort webhook dispatch (dynamic import, never blocks the caller). */
function emitEvent(tenantId: string, event: string, payload: Record<string, unknown>): void {
  import('@/modules/webhook/webhook.service')
    .then((m) => m.default.dispatchEvent(tenantId, event as never, payload))
    .catch(() => {});
}

/** Best-effort moderation audit log entry. */
function auditModeration(
  tenantId: string,
  actorId: string | null,
  action: string,
  messageId: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata: Record<string, unknown>,
): void {
  import('@/modules/audit_log/audit_log.service')
    .then((m) =>
      m.default.log({
        tenantId,
        actorId,
        actorType: actorId ? 'USER' : 'SYSTEM',
        action,
        severity,
        resourceType: 'message',
        resourceId: messageId,
        metadata,
      }),
    )
    .catch(() => {});
}

/** Best-effort in-app alert to tenant admins/moderators. */
function notifyModerators(tenantId: string, title: string, message: string): void {
  import('@/modules/notification_inapp/notification_inapp.service')
    .then((m) =>
      m.default.pushToAdmins(tenantId, {
        title,
        message,
        path: '/admin/messaging/moderation',
        type: 'moderation',
      }),
    )
    .catch(() => {});
}

/**
 * Content moderation orchestration for messaging: per-tenant policy loading,
 * synchronous keyword scanning, the async AI backstop, user reports, and manual
 * moderator actions. Side effects (audit/webhook/notify) are best-effort.
 */
export default class MessagingModerationService {
  // ─── Policy ─────────────────────────────────────────────────────────────────

  static async loadPolicy(tenantId: string): Promise<ModerationPolicy> {
    const raw = await SettingService.getByKeys(tenantId, MESSAGING_MODERATION_KEYS).catch(
      () => ({} as Record<string, string>),
    );
    const get = (k: keyof typeof MESSAGING_MODERATION_DEFAULTS): string =>
      raw[k] ?? MESSAGING_MODERATION_DEFAULTS[k];

    return {
      mode: get('messagingModerationMode') as ModerationMode,
      keywords: this.compileKeywords(get('messagingModerationKeywords')),
      useAi: get('messagingModerationUseAi') === 'true',
      aiHold: get('messagingModerationAiHold') === 'true',
      aiThreshold: Number(get('messagingModerationAiThreshold')) || 70,
      reportThreshold: Number(get('messagingModerationReportThreshold')) || 0,
    };
  }

  /** Parse a JSON array of blocklist entries into literals + compiled regexes. */
  static compileKeywords(json: string): CompiledKeywords {
    const out: CompiledKeywords = { literals: [], regexes: [] };
    let entries: unknown;
    try {
      entries = JSON.parse(json);
    } catch {
      return out;
    }
    if (!Array.isArray(entries)) return out;
    for (const e of entries) {
      if (typeof e !== 'string' || !e.trim()) continue;
      const m = e.match(/^\/(.*)\/([a-z]*)$/);
      if (m) {
        try {
          out.regexes.push(new RegExp(m[1], m[2].includes('i') ? m[2] : m[2] + 'i'));
        } catch {
          /* skip invalid regex */
        }
      } else {
        out.literals.push(e.toLowerCase());
      }
    }
    return out;
  }

  // ─── Pure scan + decision (no I/O — unit-tested directly) ─────────────────────

  static scanText(body: string, keywords: CompiledKeywords): ScanResult {
    const matched: string[] = [];
    const lower = body.toLowerCase();
    for (const lit of keywords.literals) {
      if (lit && lower.includes(lit)) matched.push(lit);
    }
    for (const re of keywords.regexes) {
      if (re.test(body)) matched.push(re.source);
    }
    return { flagged: matched.length > 0, matched };
  }

  static applyPolicy(
    mode: ModerationMode,
    scan: ScanResult,
    opts: { useAi: boolean; aiHold: boolean; aiAvailable: boolean },
  ): PolicyDecision {
    if (mode === 'OFF') return { status: 'CLEAN', reason: null, held: false, runAi: false };

    if (scan.flagged) {
      // Deterministic hit — act immediately, don't spend AI tokens re-confirming.
      if (mode === 'AUTO') return { status: 'PENDING', reason: 'keyword', held: true, runAi: false };
      return { status: 'FLAGGED', reason: 'keyword', held: false, runAi: false };
    }

    // Keyword-clean: maybe run the AI backstop.
    const canAi = opts.useAi && opts.aiAvailable;
    if (canAi && mode === 'AUTO' && opts.aiHold) {
      return { status: 'PENDING', reason: null, held: true, runAi: true };
    }
    return { status: 'CLEAN', reason: null, held: false, runAi: canAi };
  }

  // ─── Violation side effects (called from sendMessage) ─────────────────────────

  static async onViolation(
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

  // ─── AI backstop (called by the queue worker) ─────────────────────────────────

  static async runAiJob(job: ModerationJob): Promise<void> {
    const policy = await this.loadPolicy(job.tenantId);
    if (!policy.useAi) {
      // AI was turned off after enqueue — release any held message.
      if (job.held) await this.releaseHeld(job.tenantId, job.messageId);
      return;
    }
    const { classifyMessage } = await import('./messaging.moderation.ai');
    const ai = await classifyMessage(job.tenantId, job.body);
    await this.applyAiResult(job.tenantId, job.messageId, ai, policy, job.held);
  }

  static async applyAiResult(
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
      await this.publishApproved(ds, tenantId, msg);
    } else {
      await repo.save(msg); // persist score enrichment only
    }
  }

  /** Fail-open: release a stuck held message (worker exhausted retries). */
  static async releaseHeld(tenantId: string, messageId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MessageEntity);
    const msg = await repo.findOne({ where: { tenantId, messageId } });
    if (!msg || msg.moderationStatus !== 'PENDING') return;
    await this.publishApproved(ds, tenantId, msg);
  }

  // ─── User reports ─────────────────────────────────────────────────────────────

  static async createReport(
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
    const policy = await this.loadPolicy(tenantId);
    if (policy.reportThreshold > 0) {
      const openReports = await repo.count({ where: { tenantId, messageId, status: 'OPEN' } });
      if (openReports >= policy.reportThreshold && !['REJECTED', 'HIDDEN', 'PENDING'].includes(msg.moderationStatus)) {
        await this.hide(tenantId, null, messageId).catch(() => {});
      }
    }

    return SafeMessageReportSchema.parse(saved);
  }

  // ─── Manual moderation ────────────────────────────────────────────────────────

  static async moderate(
    tenantId: string,
    actorUserId: string,
    messageId: string,
    input: ModerateMessageInput,
  ): Promise<SafeMessage> {
    switch (input.action) {
      case 'approve':
        return this.approve(tenantId, actorUserId, messageId);
      case 'reject':
        return this.reject(tenantId, actorUserId, messageId, input.note);
      case 'hide':
        return this.hide(tenantId, actorUserId, messageId, input.note);
      case 'dismiss':
        // Dismiss reports without changing message state.
        await this.resolveReports(tenantId, actorUserId, messageId, 'dismiss', 'DISMISSED');
        return this.getMessage(tenantId, messageId);
      default:
        throw new AppError(MessagingMessages.INVALID_MODERATION_ACTION, 400, ErrorCode.VALIDATION_ERROR);
    }
  }

  static async approve(tenantId: string, actorUserId: string | null, messageId: string): Promise<SafeMessage> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(MessageEntity);
    const msg = await repo.findOne({ where: { tenantId, messageId } });
    if (!msg) throw new AppError(MessagingMessages.MESSAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const wasHeld = msg.moderationStatus === 'PENDING';
    const safe = await this.publishApproved(ds, tenantId, msg, actorUserId, !wasHeld);
    await this.resolveReports(tenantId, actorUserId, messageId, 'approve', 'RESOLVED');
    auditModeration(tenantId, actorUserId, 'message.moderated', messageId, 'high', { action: 'approve' });
    emitEvent(tenantId, 'message.moderated', { conversationId: msg.conversationId, messageId, status: 'APPROVED' });
    return safe;
  }

  static async reject(tenantId: string, actorUserId: string | null, messageId: string, note?: string): Promise<SafeMessage> {
    return this.setRemoved(tenantId, actorUserId, messageId, 'REJECTED', note);
  }

  static async hide(tenantId: string, actorUserId: string | null, messageId: string, note?: string): Promise<SafeMessage> {
    return this.setRemoved(tenantId, actorUserId, messageId, 'HIDDEN', note);
  }

  private static async setRemoved(
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
    await this.resolveReports(tenantId, actorUserId, messageId, status === 'REJECTED' ? 'reject' : 'hide', 'RESOLVED');
    auditModeration(tenantId, actorUserId, 'message.moderated', messageId, 'high', { action: status.toLowerCase(), note });
    emitEvent(tenantId, 'message.moderated', { conversationId: msg.conversationId, messageId, status });
    return SafeMessageSchema.parse(saved);
  }

  /** Mark a message APPROVED and (re)deliver it. Restores conversation preview when it was held. */
  private static async publishApproved(
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

  private static async resolveReports(
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

  private static async getMessage(tenantId: string, messageId: string): Promise<SafeMessage> {
    const ds = await tenantDataSourceFor(tenantId);
    const msg = await ds.getRepository(MessageEntity).findOne({ where: { tenantId, messageId } });
    if (!msg) throw new AppError(MessagingMessages.MESSAGE_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return SafeMessageSchema.parse(msg);
  }

  // ─── Moderation queue (admin) ─────────────────────────────────────────────────

  static async listQueue(
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
}
