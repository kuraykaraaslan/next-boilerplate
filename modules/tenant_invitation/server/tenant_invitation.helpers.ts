import 'reflect-metadata';
import { env } from '@nb/env';
import crypto from 'crypto';
import redis from '@nb/redis';
import SettingService from '@nb/setting/server/setting.service';
import TenantInvitationMessages from './tenant_invitation.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';

export const INVITATION_TTL_SECONDS = env.INVITATION_TTL_SECONDS ?? (60 * 60 * 24 * 7);
export const INVITATION_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);
export const NEGATIVE_CACHE_TTL = Math.min(60, INVITATION_CACHE_TTL);
export const NEG = '__not_found__';

export async function clearCache(invitation: { invitationId: string; token?: string }): Promise<void> {
  const ops: Promise<unknown>[] = [redis.del(`tenant_invitation:id:${invitation.invitationId}`)];
  if (invitation.token) ops.push(redis.del(`tenant_invitation:token:${invitation.token}`));
  await Promise.all(ops.map((p) => p.catch(() => {})));
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Per-tenant invitation TTL (`invitationTtlDays` setting); falls back to env. */
export async function resolveTtlMs(tenantId: string): Promise<number> {
  const raw = await SettingService.getValue(tenantId, 'invitationTtlDays').catch(() => null);
  const days = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(days) && days > 0 ? days * 86_400_000 : INVITATION_TTL_SECONDS * 1000;
}

/**
 * A tenant can restrict which roles may be granted via invitation
 * (`invitationAllowedRoles`, CSV). OWNER can never be granted by invitation —
 * ownership transfer is an explicit, separate flow.
 */
export async function assertRoleAllowed(tenantId: string, memberRole: string): Promise<void> {
  if (memberRole === 'OWNER') {
    throw new AppError(TenantInvitationMessages.INVITATION_ROLE_NOT_ALLOWED, 422, ErrorCode.VALIDATION_ERROR);
  }
  const raw = await SettingService.getValue(tenantId, 'invitationAllowedRoles').catch(() => null);
  if (raw) {
    const allowed = raw.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(memberRole.toUpperCase())) {
      throw new AppError(TenantInvitationMessages.INVITATION_ROLE_NOT_ALLOWED, 422, ErrorCode.VALIDATION_ERROR);
    }
  }
}

export function assertUsable(invitation: { status: string; expiresAt: Date }): void {
  if (invitation.status === 'ACCEPTED') throw new AppError(TenantInvitationMessages.INVITATION_ALREADY_ACCEPTED, 409, ErrorCode.CONFLICT);
  if (invitation.status === 'DECLINED') throw new AppError(TenantInvitationMessages.INVITATION_ALREADY_DECLINED, 409, ErrorCode.CONFLICT);
  if (invitation.status === 'REVOKED') throw new AppError(TenantInvitationMessages.INVITATION_REVOKED, 410, ErrorCode.VALIDATION_ERROR);
  if (invitation.status === 'EXPIRED' || invitation.expiresAt < new Date()) throw new AppError(TenantInvitationMessages.INVITATION_EXPIRED, 410, ErrorCode.VALIDATION_ERROR);
}
