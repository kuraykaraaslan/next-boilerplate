import 'reflect-metadata';
import { getDataSource } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import WebhookService from '@/modules/webhook/webhook.service';
import Logger from '@/modules/logger';
import { UserSecurity as UserSecurityEntity } from './entities/user_security.entity';
import UserSecurityMessages from './user_security.messages';
import { clearCache } from './user_security.helpers';

export async function recordLoginAttempt(
  userId: string,
  success: boolean,
  ip?: string,
  device?: string,
  options?: { maxAttempts?: number; lockDurationMinutes?: number; tenantId?: string; country?: string },
): Promise<{ anomaly: boolean }> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserSecurityEntity);
  const security = await repo.findOne({ where: { userId } });
  if (!security) throw new AppError(UserSecurityMessages.SECURITY_RECORD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const maxAttempts = options?.maxAttempts ?? 5;
  const lockDurationMinutes = options?.lockDurationMinutes ?? 15;
  let anomaly = false;

  if (success) {
    // Anomaly: first login is never anomalous; afterwards a new IP or device is.
    anomaly = Boolean(security.lastLoginAt) && (
      (!!ip && !!security.lastLoginIp && ip !== security.lastLoginIp) ||
      (!!device && !!security.lastLoginDevice && device !== security.lastLoginDevice)
    );
    await repo.update({ userId }, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      lastLoginDevice: device,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });
    if (anomaly && options?.tenantId) {
      WebhookService.dispatchEvent(options.tenantId, 'security.login_anomaly', {
        userId, ip: ip ?? null, device: device ?? null, country: options.country ?? null,
        previousIp: security.lastLoginIp ?? null, at: new Date().toISOString(),
      }).catch((err: unknown) => Logger.warn(`[user_security] anomaly webhook failed: ${err instanceof Error ? err.message : err}`));
    }
  } else {
    // Adaptive lockout: exponential backoff once the threshold is crossed.
    const attempts = security.failedLoginAttempts + 1;
    let lockedUntil: Date | undefined;
    if (attempts >= maxAttempts) {
      const over = attempts - maxAttempts;
      const minutes = Math.min(lockDurationMinutes * 2 ** over, 24 * 60); // cap at 24h
      lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
    }
    await repo.update({ userId }, { failedLoginAttempts: attempts, lockedUntil });
  }
  await clearCache(userId);
  return { anomaly };
}

export async function isLocked(userId: string): Promise<boolean> {
  const ds = await getDataSource();
  const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
  if (!security || !security.lockedUntil) return false;
  return new Date() < security.lockedUntil;
}

/**
 * KD-7: Append a new password hash to the rotation history and trim to
 * the most-recent `historyCount` entries. Also stamps `passwordChangedAt`
 * and clears `mustChangePassword`. Callers must pass an already-hashed
 * value (bcrypt) — never plaintext.
 */
export async function pushPasswordHistory(userId: string, passwordHash: string, historyCount: number): Promise<void> {
  const ds = await getDataSource();
  await ds.transaction(async (manager) => {
    const repo = manager.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId } });
    if (!security) throw new AppError(UserSecurityMessages.SECURITY_RECORD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const existing = Array.isArray(security.passwordHistory) ? (security.passwordHistory as string[]) : [];
    const next = [passwordHash, ...existing].slice(0, Math.max(0, historyCount));

    await repo.update({ userId }, {
      passwordHistory: next as any,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
    });
  });
  await clearCache(userId);
}

export async function getPasswordHistory(userId: string): Promise<string[]> {
  const ds = await getDataSource();
  const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
  if (!security) return [];
  return Array.isArray(security.passwordHistory) ? (security.passwordHistory as string[]) : [];
}

export async function getPasswordChangedAt(userId: string): Promise<Date | null> {
  const ds = await getDataSource();
  const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
  return security?.passwordChangedAt ?? null;
}

export async function setMustChangePassword(userId: string, value: boolean): Promise<void> {
  const ds = await getDataSource();
  await ds.getRepository(UserSecurityEntity).update({ userId }, { mustChangePassword: value });
  await clearCache(userId);
}
