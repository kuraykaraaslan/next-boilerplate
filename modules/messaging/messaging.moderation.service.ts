import 'reflect-metadata';
import type { SafeMessage, SafeMessageReport } from './messaging.types';
import type { ModerationMode } from './messaging.enums';
import type { ReportMessageInput, ModerateMessageInput, ModerationQueueInput } from './messaging.dto';
import type { AiClassifyResult } from './messaging.moderation.ai';
import type { ModerationJob } from './messaging.moderation.queue';
import type {
  CompiledKeywords, ModerationPolicy, ScanResult, PolicyDecision,
} from './messaging.moderation.types';
import { loadPolicy, compileKeywords, scanText, applyPolicy } from './messaging.moderation.policy';
import { onViolation, moderate, approve, reject, hide } from './messaging.moderation.actions';
import { runAiJob, applyAiResult, releaseHeld } from './messaging.moderation.worker';
import { createReport, listQueue } from './messaging.moderation.reports';

export type { CompiledKeywords, ModerationPolicy, ScanResult, PolicyDecision };

/**
 * Content moderation orchestration for messaging: per-tenant policy loading,
 * synchronous keyword scanning, the async AI backstop, user reports, and manual
 * moderator actions. Side effects (audit/webhook/notify) are best-effort.
 *
 * The implementation is split across focused modules (`messaging.moderation.policy`,
 * `.actions`, `.worker`, `.reports`, plus the `.effects` / `.types` helpers); this
 * class preserves the single `MessagingModerationService.*` entry point.
 */
export default class MessagingModerationService {
  static loadPolicy(tenantId: string): Promise<ModerationPolicy> {
    return loadPolicy(tenantId);
  }

  static compileKeywords(json: string): CompiledKeywords {
    return compileKeywords(json);
  }

  static scanText(body: string, keywords: CompiledKeywords): ScanResult {
    return scanText(body, keywords);
  }

  static applyPolicy(
    mode: ModerationMode,
    scan: ScanResult,
    opts: { useAi: boolean; aiHold: boolean; aiAvailable: boolean },
  ): PolicyDecision {
    return applyPolicy(mode, scan, opts);
  }

  static onViolation(tenantId: string, msg: SafeMessage, decision: PolicyDecision, mode: ModerationMode): Promise<void> {
    return onViolation(tenantId, msg, decision, mode);
  }

  static runAiJob(job: ModerationJob): Promise<void> {
    return runAiJob(job);
  }

  static applyAiResult(
    tenantId: string,
    messageId: string,
    ai: AiClassifyResult,
    policy: ModerationPolicy,
    wasHeld: boolean,
  ): Promise<void> {
    return applyAiResult(tenantId, messageId, ai, policy, wasHeld);
  }

  static releaseHeld(tenantId: string, messageId: string): Promise<void> {
    return releaseHeld(tenantId, messageId);
  }

  static createReport(
    tenantId: string,
    reporterUserId: string,
    conversationId: string,
    messageId: string,
    input: ReportMessageInput,
  ): Promise<SafeMessageReport> {
    return createReport(tenantId, reporterUserId, conversationId, messageId, input);
  }

  static moderate(tenantId: string, actorUserId: string, messageId: string, input: ModerateMessageInput): Promise<SafeMessage> {
    return moderate(tenantId, actorUserId, messageId, input);
  }

  static approve(tenantId: string, actorUserId: string | null, messageId: string): Promise<SafeMessage> {
    return approve(tenantId, actorUserId, messageId);
  }

  static reject(tenantId: string, actorUserId: string | null, messageId: string, note?: string): Promise<SafeMessage> {
    return reject(tenantId, actorUserId, messageId, note);
  }

  static hide(tenantId: string, actorUserId: string | null, messageId: string, note?: string): Promise<SafeMessage> {
    return hide(tenantId, actorUserId, messageId, note);
  }

  static listQueue(tenantId: string, input: ModerationQueueInput): Promise<{ messages: SafeMessage[]; reports: SafeMessageReport[] }> {
    return listQueue(tenantId, input);
  }
}
