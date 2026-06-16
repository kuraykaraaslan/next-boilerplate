import { z } from 'zod';
import { getDataSource } from '@nb/db';
import { UserSession as UserSessionEntity } from '@nb/user_session/server/entities/user_session.entity';
import { SafeUserSession, SafeUserSessionSchema } from '@nb/user_session/server/user_session.types';
import UserSessionService from '@nb/user_session/server/user_session.service';
import WebhookService from '@nb/webhook/server/webhook.service';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import { AuditActions } from '@nb/audit_log/server/audit_log.enums';

const ImpersonationSessionMetaSchema = z.object({
  impersonation: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export interface EndImpersonationContext {
  actorId?: string;
  targetUserId?: string;
  tenantId?: string;
  /** Shared id linking START → END for duration tracking (GOODTOHAVE #11). */
  impersonationSessionId?: string;
  /** Unix ms when the impersonation started, to compute duration. */
  startedAtMs?: number;
}

export async function endImpersonationSession(
  userSessionId: string,
  context?: EndImpersonationContext,
): Promise<void> {
  await UserSessionService.deleteSession(userSessionId);

  if (context?.actorId) {
    const durationMs =
      typeof context.startedAtMs === 'number' && Number.isFinite(context.startedAtMs)
        ? Math.max(0, Date.now() - context.startedAtMs)
        : undefined;

    AuditLogService.log({
      actorType: 'USER',
      actorId: context.actorId,
      // Dual-actor: actor is the impersonator, the target is recorded as the
      // on-behalf-of subject (GOODTOHAVE #11). impersonatorId also lives in
      // metadata for forward-compat with the audit DTO extension.
      onBehalfOfActorId: context.targetUserId,
      action: AuditActions.IMPERSONATION_ENDED,
      resourceType: 'user',
      resourceId: context.targetUserId,
      metadata: {
        tenantId: context.tenantId,
        impersonatorId: context.actorId,
        targetUserId: context.targetUserId,
        impersonationSessionId: context.impersonationSessionId,
        durationMs,
      },
    });

    // GOODTOHAVE #12 — emit impersonation.ended webhook.
    if (context.tenantId) {
      void WebhookService.dispatchEvent(context.tenantId, 'impersonation.ended', {
        impersonatorUserId: context.actorId,
        targetUserId: context.targetUserId,
        impersonationSessionId: context.impersonationSessionId,
        durationMs,
      }).catch(() => undefined);
    }
  }
}

export async function getActiveImpersonationSession(rawAccessToken: string): Promise<SafeUserSession | null> {
  const hashedToken = UserSessionService.hashToken(rawAccessToken);
  const ds = await getDataSource();
  const session = await ds.getRepository(UserSessionEntity).findOne({
    where: { accessToken: hashedToken },
  });

  if (!session) return null;
  const meta = ImpersonationSessionMetaSchema.safeParse(session.metadata);
  if (!meta.success || !meta.data.impersonation) return null;
  if (session.sessionExpiry < new Date()) return null;

  return SafeUserSessionSchema.parse(session);
}

/**
 * GOODTOHAVE #5 / #7 — disclosure-banner + auto-expiry context for the UI.
 * Returns the impersonation flag, impersonator id and expiry so the client
 * can render a persistent banner and a countdown. Returns null when the token
 * is not an active impersonation session.
 */
export async function getImpersonationContext(rawAccessToken: string): Promise<{
  isImpersonating: true;
  impersonatorUserId: string | null;
  targetUserId: string;
  tenantId: string | null;
  targetTenantRole: string | null;
  impersonationSessionId: string | null;
  expiresAt: string;
  remainingMs: number;
} | null> {
  const session = await getActiveImpersonationSession(rawAccessToken);
  if (!session) return null;
  const meta = (session.metadata as any)?.impersonation ?? {};
  const expiry = new Date(session.sessionExpiry);
  return {
    isImpersonating: true,
    impersonatorUserId: meta.impersonatorUserId ?? null,
    targetUserId: session.userId,
    tenantId: meta.tenantId ?? null,
    targetTenantRole: meta.targetTenantRole ?? null,
    impersonationSessionId: meta.impersonationSessionId ?? null,
    expiresAt: expiry.toISOString(),
    remainingMs: Math.max(0, expiry.getTime() - Date.now()),
  };
}
