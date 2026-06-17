import { randomUUID } from 'crypto';
import redis from '@kuraykaraaslan/redis';
import Logger from '@kuraykaraaslan/logger';
import UserSessionService from '@kuraykaraaslan/user_session/server/user_session.service';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { AuditActions } from '@kuraykaraaslan/audit_log/server/audit_log.enums';
import { SafeUserSchema } from '@kuraykaraaslan/user/server/user.types';
import type { SafeUserSession } from '@kuraykaraaslan/user_session/server/user_session.types';
import type { TenantMemberRole } from '@kuraykaraaslan/tenant_member/server/tenant_member.enums';
import {
  getAlertStartsPerHour,
  getImpersonationTtlMs,
} from './impersonation.settings.service';

// Redis key helpers for per-impersonator anomaly counting (GOODTOHAVE #12).
const anomalyKey = (impersonatorUserId: string) =>
  `impersonation:starts:${impersonatorUserId}`;

export interface ImpersonationSessionResult {
  userSession: SafeUserSession;
  rawAccessToken: string;
  rawRefreshToken: string;
}

export async function mintAndAudit({
  impersonatorUser,
  impersonatorSession,
  safeTargetUser,
  targetUserId,
  tenantId,
  resolvedRole,
  flow,
  reason,
  userAgent,
  ipAddress,
}: {
  impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
  impersonatorSession: SafeUserSession;
  safeTargetUser: ReturnType<typeof SafeUserSchema.parse>;
  targetUserId: string;
  tenantId: string;
  resolvedRole: TenantMemberRole;
  flow: 'system' | 'tenant';
  reason: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<ImpersonationSessionResult> {
  // Shared id links START → END for duration tracking (GOODTOHAVE #11).
  const impersonationSessionId = randomUUID();

  // Per-tenant impersonation session TTL (GOODTOHAVE #1). Single source of
  // truth — user_session consumes the resolved value (no reverse import).
  const ttlMs = await getImpersonationTtlMs(tenantId);

  const result = await UserSessionService.createImpersonationSession({
    targetUser: safeTargetUser,
    ttlMs,
    // `impersonationSessionId` + `reason` are extra fields the user_session
    // orchestrator persists verbatim; the typed slice only declares the core
    // fields, so cast to satisfy the strict nested schema type.
    impersonationMeta: {
      impersonatorUserId: impersonatorUser.userId,
      impersonatorSessionId: impersonatorSession.userSessionId,
      tenantId,
      targetTenantRole: resolvedRole,
      impersonationSessionId,
      reason,
    } as unknown as Parameters<typeof UserSessionService.createImpersonationSession>[0]['impersonationMeta'],
    userAgent,
    ipAddress,
  });

  AuditLogService.log({
    actorType: 'USER',
    actorId: impersonatorUser.userId,
    onBehalfOfActorId: targetUserId,
    action: AuditActions.IMPERSONATION_STARTED,
    resourceType: 'user',
    resourceId: targetUserId,
    metadata: {
      tenantId,
      impersonatorId: impersonatorUser.userId,
      targetTenantRole: resolvedRole,
      flow,
      reason,
      impersonationSessionId,
      startedAtMs: Date.now(),
      ipAddress,
      userAgent,
    },
  });

  // GOODTOHAVE #12 — anomaly counter + webhook.
  await recordStartAndMaybeAlert({ impersonatorUser, targetUserId, tenantId, reason });

  return result;
}

/**
 * GOODTOHAVE #12 — increment a per-impersonator hourly counter, emit the
 * impersonation.started webhook, and fire an anomaly signal when the count
 * exceeds the tenant's configured threshold. Best-effort; never blocks the
 * start flow.
 */
async function recordStartAndMaybeAlert({
  impersonatorUser,
  targetUserId,
  tenantId,
  reason,
}: {
  impersonatorUser: ReturnType<typeof SafeUserSchema.parse>;
  targetUserId: string;
  tenantId: string;
  reason: string;
}): Promise<void> {
  let countThisHour = 0;
  try {
    const key = anomalyKey(impersonatorUser.userId);
    countThisHour = await redis.incr(key);
    if (countThisHour === 1) {
      await redis.expire(key, 3600);
    }
  } catch (err) {
    Logger.warn(`[Impersonation] anomaly counter unavailable: ${err}`);
  }

  void WebhookService.dispatchEvent(tenantId, 'impersonation.started', {
    impersonatorUserId: impersonatorUser.userId,
    targetUserId,
    reason,
    startsThisHour: countThisHour,
  }).catch(() => undefined);

  const threshold = await getAlertStartsPerHour(tenantId);
  if (threshold > 0 && countThisHour > threshold) {
    Logger.warn(
      `[Impersonation][ANOMALY] impersonator=${impersonatorUser.userId} tenant=${tenantId} ` +
      `starts=${countThisHour} exceeds threshold=${threshold}`,
    );
    // Surface the anomaly through the audit log so it lands in the
    // high-risk audit webhook / monitoring pipeline as well.
    AuditLogService.log({
      actorType: 'USER',
      actorId: impersonatorUser.userId,
      onBehalfOfActorId: targetUserId,
      action: AuditActions.IMPERSONATION_STARTED,
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { tenantId, impersonatorId: impersonatorUser.userId, anomaly: true, startsThisHour: countThisHour, threshold },
    });
  }
}
