import redis from '@nb/redis';
import { env } from '@nb/env';

export const USER_CACHE_TTL = env.SESSION_CACHE_TTL ?? (60 * 5);
export const NEGATIVE_CACHE_TTL = Math.min(60, USER_CACHE_TTL);
export const NEG = '__not_found__';

export async function invalidate(user: { userId: string; email?: string }): Promise<void> {
  const ops: Promise<unknown>[] = [redis.del(`user:id:${user.userId}`)];
  if (user.email) ops.push(redis.del(`user:email:${user.email.toLowerCase()}`));
  await Promise.all(ops.map((p) => p.catch(() => {})));
}

// ── HaveIBeenPwned k-anonymity check ────────────────────────────────────────
export async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const { createHash } = await import('node:crypto');
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    return text.split('\r\n').some((line) => line.startsWith(suffix));
  } catch {
    return false; // fail-open: don't block registration on network error
  }
}

export async function emitAuditLog(
  tenantId: string | null,
  action: string,
  resourceId: string,
  actorId?: string | null,
): Promise<void> {
  try {
    const AuditLogService = (await import('@nb/audit_log/server/audit_log.service')).default;
    await AuditLogService.log({
      tenantId: tenantId ?? undefined,
      actorId: actorId ?? undefined,
      actorType: actorId ? 'USER' : 'SYSTEM',
      action,
      resourceType: 'user',
      resourceId,
    });
  } catch { /* best-effort */ }
}
