import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { getDataSource } from '@nb/db';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import SettingService from '@nb/setting/server/setting.service';
import WebhookService from '@nb/webhook/server/webhook.service';
import Logger from '@nb/logger';
import { UserSecurity as UserSecurityEntity } from './entities/user_security.entity';
import { type TrustedDevice } from './user_security.types';
import UserSecurityMessages from './user_security.messages';
import { sha256, safeEqualHex, clearCache } from './user_security.helpers';
import { updateUserSecurity, getSafeByUserId } from './user_security.crud.service';

// ── Backup codes — stored as SHA-256 hashes, shown in plaintext only once ──

/** Generate `count` single-use backup codes, persist their hashes, return the plaintext (once). */
export async function generateBackupCodes(userId: string, count = 10): Promise<string[]> {
  const plain = Array.from({ length: count }, () => randomBytes(5).toString('hex')); // 10 hex chars
  const hashes = plain.map(sha256);
  await updateUserSecurity(userId, { otpBackupCodes: hashes });
  return plain;
}

/** Verify a backup code in constant time; on success consume (remove) it. */
export async function verifyAndConsumeBackupCode(userId: string, code: string): Promise<boolean> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserSecurityEntity);
  const security = await repo.findOne({ where: { userId } });
  if (!security) return false;
  const stored = Array.isArray(security.otpBackupCodes) ? (security.otpBackupCodes as string[]) : [];
  const target = sha256(code.trim());
  const idx = stored.findIndex((h) => safeEqualHex(h, target));
  if (idx === -1) return false;
  stored.splice(idx, 1);
  await repo.update({ userId }, { otpBackupCodes: stored as any });
  await clearCache(userId);
  return true;
}

// ── Per-tenant MFA enforcement policy ──

/**
 * Resolve the tenant's MFA policy from settings:
 * `mfaRequired` ('true'|'false') and `mfaRequiredRoles` (CSV of roles that
 * must use MFA regardless of the global flag).
 */
export async function getMfaPolicy(tenantId: string): Promise<{ required: boolean; requiredRoles: string[] }> {
  const s = await SettingService.getByKeys(tenantId, ['mfaRequired', 'mfaRequiredRoles']).catch(() => ({} as Record<string, string | null>));
  return {
    required: s.mfaRequired === 'true',
    requiredRoles: (s.mfaRequiredRoles ?? '').split(',').map((r) => r.trim()).filter(Boolean),
  };
}

/** Whether MFA must be enforced for a user with `role` in this tenant. */
export async function isMfaRequiredFor(tenantId: string, role?: string | null): Promise<boolean> {
  const policy = await getMfaPolicy(tenantId);
  if (policy.required) return true;
  return Boolean(role && policy.requiredRoles.includes(role));
}

/** True when the user has at least one active second factor configured. */
export async function hasMfaConfigured(userId: string): Promise<boolean> {
  const sec = await getSafeByUserId(userId);
  return (sec.otpMethods?.length ?? 0) > 0 || sec.passkeyEnabled === true;
}

/** Emit the MFA enable/disable security webhook (best-effort). */
export async function emitMfaChanged(tenantId: string, userId: string, enabled: boolean): Promise<void> {
  await WebhookService.dispatchEvent(tenantId, enabled ? 'security.mfa_enabled' : 'security.mfa_disabled', {
    userId, at: new Date().toISOString(),
  }).catch((err: unknown) => Logger.warn(`[user_security] mfa webhook failed: ${err instanceof Error ? err.message : err}`));
}

// ── Trusted devices (remember-this-device) — only token hashes are stored ──

/**
 * Register a trusted device and return the opaque token to set as a secure,
 * httpOnly cookie. Only the SHA-256 hash of the token is persisted.
 */
export async function trustDevice(userId: string, label: string | null, ttlDays = 30): Promise<string> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserSecurityEntity);
  const security = await repo.findOne({ where: { userId } });
  if (!security) throw new AppError(UserSecurityMessages.SECURITY_RECORD_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + ttlDays * 86_400_000);
  const existing = (Array.isArray(security.trustedDevices) ? security.trustedDevices : []) as TrustedDevice[];
  const pruned = existing.filter((d) => new Date(d.expiresAt) > now);
  pruned.push({ idHash: sha256(token), label, createdAt: now.toISOString(), lastSeenAt: now.toISOString(), expiresAt: expires.toISOString() });
  await repo.update({ userId }, { trustedDevices: pruned as any });
  await clearCache(userId);
  return token;
}

/** True when the presented device token matches a non-expired trusted device. */
export async function isDeviceTrusted(userId: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const ds = await getDataSource();
  const security = await ds.getRepository(UserSecurityEntity).findOne({ where: { userId } });
  if (!security) return false;
  const target = sha256(token);
  const now = new Date();
  const devices = (Array.isArray(security.trustedDevices) ? security.trustedDevices : []) as TrustedDevice[];
  return devices.some((d) => new Date(d.expiresAt) > now && safeEqualHex(d.idHash, target));
}

/** Revoke all trusted devices for a user (e.g. on password change or logout-everywhere). */
export async function revokeTrustedDevices(userId: string): Promise<void> {
  const ds = await getDataSource();
  await ds.getRepository(UserSecurityEntity).update({ userId }, { trustedDevices: [] as any });
  await clearCache(userId);
}
