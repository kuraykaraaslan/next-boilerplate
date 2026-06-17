import crypto from 'crypto';
import bcrypt from 'bcrypt';
import Logger from '@kuraykaraaslan/logger';
import ObservabilityService from '@kuraykaraaslan/observability';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import AuthPolicyService from './auth.policy.service';
import type { SafeUser } from '@kuraykaraaslan/user/server/user.types';

export function generateToken(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * GTH-6: bcrypt cost is per-tenant (`bcryptCost`, validated 4..15), falling
 * back to the historical default of 10. Pass `tenantId` to honour the tenant
 * tier; without it the default is used.
 */
export async function hashPassword(password: string, tenantId?: string): Promise<string> {
  const { bcryptCost } = await AuthPolicyService.getCredentialPolicy(tenantId);
  return bcrypt.hash(password, bcryptCost);
}

export function checkIfUserHasRole(user: SafeUser, requiredRole: string): boolean {
  const roles = ['SUPER_ADMIN', 'ADMIN', 'USER', 'GUEST'];
  return roles.indexOf(user.userRole) <= roles.indexOf(requiredRole);
}

/** GTH-17: per-tenant login-failure counter on the Prometheus registry. */
export function recordLoginFailureMetric(tenantId: string | undefined, reason: string): void {
  try {
    ObservabilityService.recordTenantUsage({
      tenantId: tenantId ?? ROOT_TENANT_ID,
      metric: `auth_login_failure:${reason}`,
      value: 1,
    });
  } catch (err: unknown) {
    Logger.warn(`AuthCredentialService: login-failure metric emit failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** GTH-18: fire the (already-registered) `auth.account_locked` tenant webhook. */
export function emitAccountLockedEvent(args: {
  tenantId?: string; userId: string; email: string;
  maxAttempts: number; lockDurationMinutes: number;
  ipAddress?: string; userAgent?: string;
}): void {
  WebhookService.dispatchEvent(args.tenantId ?? ROOT_TENANT_ID, 'auth.account_locked', {
    userId: args.userId,
    email: args.email,
    maxAttempts: args.maxAttempts,
    lockDurationMinutes: args.lockDurationMinutes,
    ipAddress: args.ipAddress ?? null,
    userAgent: args.userAgent ?? null,
    lockedAt: new Date().toISOString(),
  }).catch((err: unknown) => {
    Logger.warn(`AuthCredentialService: account_locked webhook dispatch failed: ${err instanceof Error ? err.message : String(err)}`);
  });
}
