import redis from '@nb/redis';
import { env } from '@nb/env';
import Logger from '@nb/logger';
import type { SocialAccountProvider } from './user_social_account.enums';

export const SOCIAL_ACCOUNT_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);

/** Optional context for tenant-scoped policy / audit / notification. */
export interface SocialLinkContext {
  tenantId?: string;
  expiresAt?: Date | null;
  scopes?: string[];
  notify?: boolean;
}

export async function clearCache(opts: { userId?: string; provider?: SocialAccountProvider; providerId?: string }): Promise<void> {
  const ops: Promise<unknown>[] = [];
  if (opts.userId) ops.push(redis.del(`user_social_account:user:${opts.userId}`));
  if (opts.provider && opts.providerId) {
    ops.push(redis.del(`user_social_account:provider:${opts.provider}:${opts.providerId}`));
  }
  await Promise.all(ops.map((p) => p.catch(() => {})));
}

export async function emitLinkEvent(
  kind: 'linked' | 'unlinked', userId: string, provider: SocialAccountProvider, ctx?: SocialLinkContext,
): Promise<void> {
  try {
    const { default: AuditLogService } = await import('@nb/audit_log/server/audit_log.service');
    await AuditLogService.log({
      tenantId: ctx?.tenantId ?? null, actorId: userId, actorType: 'USER',
      action: `social_account.${kind}`, severity: 'medium',
      resourceType: 'user_social_account', resourceId: userId, metadata: { provider },
    });
  } catch (e) { Logger.warn(`[social] audit failed: ${e instanceof Error ? e.message : e}`); }
  try {
    const { default: WebhookService } = await import('@nb/webhook/server/webhook.service');
    await WebhookService.dispatchPlatformEvent(`social_account.${kind}` as never, { userId, provider });
  } catch (e) { Logger.warn(`[social] webhook failed: ${e instanceof Error ? e.message : e}`); }
}

export async function notifyUser(userId: string, provider: SocialAccountProvider, kind: 'linked' | 'unlinked', tenantId: string): Promise<void> {
  try {
    const { default: UserService } = await import('@nb/user/server/user.service');
    const user = await UserService.getById(userId).catch(() => null);
    if (!user?.email) return;
    const { default: NotificationMailQueueService } = await import('@nb/notification_mail/server/notification_mail.queue.service');
    const verb = kind === 'linked' ? 'linked to' : 'unlinked from';
    await NotificationMailQueueService.sendMail(
      tenantId, user.email,
      `A social account was ${verb} your account`,
      `<p>The <strong>${provider}</strong> provider was ${verb} your account. If this wasn't you, secure your account immediately.</p>`,
    );
  } catch (e) { Logger.warn(`[social] notify failed: ${e instanceof Error ? e.message : e}`); }
}
