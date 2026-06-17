import 'reflect-metadata';
import type { SafeTenant } from '@kuraykaraaslan/tenant/server/tenant.types';
import type { SafeTenantMember } from '@kuraykaraaslan/tenant_member/server/tenant_member.types';
import type { SafeUser } from '@kuraykaraaslan/user/server/user.types';
import type { TenantMemberRole } from '@kuraykaraaslan/tenant_member/server/tenant_member.enums';
import type { TenantSessionContext, TenantSessionRequestContext } from './tenant_session.types';
import {
  hasRequiredRole, getTenantById, getTenantMembership,
  validateTenantStatus, validateMemberStatus,
  getUserTenants, clearTenantCache, clearUserTenantCaches,
} from './tenant_session.membership';
import {
  resolveSessionTtl, assertIpAllowed, assert2faSatisfied,
  assertConcurrentLimit, checkGeoAnomaly,
} from './tenant_session.policy';
import { authenticateTenantMembership } from './tenant_session.resolve.service';

export type { TenantSessionContext, TenantSessionRequestContext };

/**
 * Tenant-session service facade. The implementation is split across focused
 * modules (`tenant_session.membership`, `tenant_session.policy`,
 * `tenant_session.resolve.service`, plus the `tenant_session.types` helper);
 * this class preserves the single `TenantSessionService.*` entry point.
 */
export default class TenantSessionService {
  static hasRequiredRole(memberRole: TenantMemberRole, requiredRole: TenantMemberRole): boolean {
    return hasRequiredRole(memberRole, requiredRole);
  }

  static getTenantById(tenantId: string): Promise<SafeTenant | null> {
    return getTenantById(tenantId);
  }

  static getTenantMembership(tenantId: string, userId: string): Promise<SafeTenantMember | null> {
    return getTenantMembership(tenantId, userId);
  }

  static validateTenantStatus(tenant: SafeTenant): void {
    validateTenantStatus(tenant);
  }

  static validateMemberStatus(tenantMember: SafeTenantMember): void {
    validateMemberStatus(tenantMember);
  }

  static resolveSessionTtl(tenantId: string): Promise<number> {
    return resolveSessionTtl(tenantId);
  }

  static assertIpAllowed(tenantId: string, ip: string | null | undefined): Promise<void> {
    return assertIpAllowed(tenantId, ip);
  }

  static assert2faSatisfied(tenantId: string, ctx: TenantSessionRequestContext): Promise<void> {
    return assert2faSatisfied(tenantId, ctx);
  }

  static assertConcurrentLimit(tenantId: string, userId: string, ctx: TenantSessionRequestContext, ttl: number): Promise<void> {
    return assertConcurrentLimit(tenantId, userId, ctx, ttl);
  }

  static checkGeoAnomaly(tenantId: string, userId: string, ctx: TenantSessionRequestContext): Promise<boolean> {
    return checkGeoAnomaly(tenantId, userId, ctx);
  }

  static authenticateTenantMembership(params: {
    user: SafeUser;
    tenantId: string;
    requiredRole?: TenantMemberRole;
    context?: TenantSessionRequestContext;
  }): Promise<{ tenant: SafeTenant; tenantMember: SafeTenantMember }> {
    return authenticateTenantMembership(params);
  }

  static getUserTenants(userId: string): Promise<Array<{ tenant: SafeTenant; tenantMember: SafeTenantMember }>> {
    return getUserTenants(userId);
  }

  static clearTenantCache(userId: string, tenantId: string): Promise<void> {
    return clearTenantCache(userId, tenantId);
  }

  static clearUserTenantCaches(userId: string): Promise<void> {
    return clearUserTenantCaches(userId);
  }
}
