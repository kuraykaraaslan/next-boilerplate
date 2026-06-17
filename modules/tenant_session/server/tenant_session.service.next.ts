import { NextRequest } from 'next/server';
import { SafeUser } from '@kuraykaraaslan/user/server/user.types';
import { SafeTenant } from '@kuraykaraaslan/tenant/server/tenant.types';
import { SafeTenantMember } from '@kuraykaraaslan/tenant_member/server/tenant_member.types';
import { SafeUserSession, type SessionMeta } from '@kuraykaraaslan/user_session/server/user_session.types';
import UserSessionNextService from '@kuraykaraaslan/user_session/server/user_session.service.next';
import TenantSessionService from '@kuraykaraaslan/tenant_session/server/tenant_session.service';
import TenantAuthMessages from '@kuraykaraaslan/tenant_session/server/tenant_session.messages';
import type { TenantMemberRole } from '@kuraykaraaslan/tenant_member/server/tenant_member.enums';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { AuditActions } from '@kuraykaraaslan/audit_log/server/audit_log.enums';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import ObservabilityService from '@kuraykaraaslan/observability';

type TenantIdSource = 'header' | 'subdomain' | 'query' | 'body' | 'param';

export default class TenantSessionNextService {

  /**
   * Extract tenant ID from various sources in the request
   * @param request - The Next.js request object
   * @param source - The source to extract tenant ID from
   * @param paramKey - Optional parameter key for query/body/param extraction
   * @returns The tenant ID or null
   */
  static extractTenantId(
    request: NextRequest,
    source: TenantIdSource = 'header',
    paramKey: string = 'tenantId'
  ): string | null {
    switch (source) {
      case 'header':
        return request.headers.get('x-tenant-id');

      case 'subdomain':
        const host = request.headers.get('host');
        if (!host) return null;
        const subdomain = host.split('.')[0];
        // Avoid matching localhost, www, api, etc.
        if (['localhost', 'www', 'api', '127'].includes(subdomain)) return null;
        return subdomain;

      case 'query':
        const url = new URL(request.url);
        return url.searchParams.get(paramKey);

      case 'param':
        // For dynamic routes like /api/tenant/[tenantId]
        // The calling code should pass this via paramKey
        return paramKey;

      case 'body':
        // Body extraction needs to be done by caller since we can't read body here
        return null;

      default:
        throw new Error(TenantAuthMessages.INVALID_TENANT_ID_SOURCE);
    }
  }

  /**
   * Authenticate user and verify tenant membership with required role
   * Global admins (userRole === 'ADMIN') bypass tenant membership check
   * @param request - The Next.js request object
   * @param requiredTenantRole - The required tenant role
   * @param tenantIdSource - Where to extract tenant ID from
   * @param tenantId - Optional direct tenant ID (overrides source extraction)
   * @param otpVerifyBypass - Whether to bypass OTP verification for user auth
   * @param allowGlobalAdmin - Whether to allow global admins to bypass tenant membership (default: true)
   * @returns The authenticated user, session, tenant, and tenant member (or virtual member for global admin)
   */
  static async authenticateTenantByRequest({
    request,
    requiredTenantRole = 'USER',
    tenantIdSource = 'header',
    tenantId: directTenantId,
    otpVerifyBypass = false,
    allowGlobalAdmin = true,
  }: {
    request: NextRequest;
    requiredTenantRole?: TenantMemberRole;
    tenantIdSource?: TenantIdSource;
    tenantId?: string;
    otpVerifyBypass?: boolean;
    allowGlobalAdmin?: boolean;
  }): Promise<{
    user: SafeUser;
    userSession: SafeUserSession;
    tenant: SafeTenant;
    tenantMember: SafeTenantMember;
    isGlobalAdmin?: boolean;
    isImpersonating?: boolean;
    impersonatedBy?: SafeUser;
  }> {
    // Step 1: Authenticate user first (also populates request.isImpersonating / request.impersonatedBy)
    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: 'USER',
      otpVerifyBypass,
    });

    // Step 2: Get tenant ID
    const tenantId = directTenantId || this.extractTenantId(request, tenantIdSource);

    if (!tenantId) {
      throw new Error(TenantAuthMessages.TENANT_ID_REQUIRED);
    }

    // Step 3: Impersonation takes precedence — use targetTenantRole from session metadata
    const meta = userSession.metadata as SessionMeta | null | undefined;
    const impersonation = meta?.impersonation;

    if (impersonation && impersonation.tenantId === tenantId && impersonation.targetTenantRole) {
      const tenant = await TenantSessionService.getTenantById(tenantId);
      if (!tenant) throw new Error(TenantAuthMessages.TENANT_NOT_FOUND);
      TenantSessionService.validateTenantStatus(tenant);

      const role = impersonation.targetTenantRole as TenantMemberRole;

      if (!TenantSessionService.hasRequiredRole(role, requiredTenantRole)) {
        throw new Error(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS);
      }

      const virtualMember: SafeTenantMember = {
        tenantMemberId: `impersonation-${userSession.userSessionId}`,
        tenantId,
        userId: user.userId,
        memberRole: role,
        memberStatus: 'ACTIVE',
        sessionVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      request.tenant = tenant;
      request.tenantMember = virtualMember;

      const extReq = request as NextRequest & { isImpersonating?: boolean; impersonatedBy?: SafeUser };
      const isImpersonating = !!extReq.isImpersonating;
      const impersonatedBy = extReq.impersonatedBy;

      ObservabilityService.setTags({ tenantId, userId: user.userId });
      return { user, userSession, tenant, tenantMember: virtualMember, isGlobalAdmin: false, isImpersonating, impersonatedBy };
    }

    // Step 4: Check if user is global admin
    const isGlobalAdmin = allowGlobalAdmin && user.userRole === 'ADMIN';

    if (isGlobalAdmin) {
      // Global admin bypass - just get the tenant without membership check,
      // but still enforce tenant status (SUSPENDED/INACTIVE blocks even root admins
      // — a suspended tenant must be fully frozen, no admin escape hatch).
      const tenant = await TenantSessionService.getTenantById(tenantId);

      if (!tenant) {
        throw new Error(TenantAuthMessages.TENANT_NOT_FOUND);
      }

      TenantSessionService.validateTenantStatus(tenant);

      // Create a virtual tenant member for global admin with OWNER privileges
      const virtualTenantMember: SafeTenantMember = {
        tenantMemberId: `global-admin-${user.userId}`,
        tenantId: tenant.tenantId,
        userId: user.userId,
        memberRole: 'OWNER',
        memberStatus: 'ACTIVE',
        sessionVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      request.tenant = tenant;
      request.tenantMember = virtualTenantMember;

      ObservabilityService.setTags({ tenantId, userId: user.userId });
      return { user, userSession, tenant, tenantMember: virtualTenantMember, isGlobalAdmin: true };
    }

    // Step 4: Authenticate tenant membership using core service (for non-global-admins)
    let tenant: SafeTenant;
    let tenantMember: SafeTenantMember;
    try {
      const result = await TenantSessionService.authenticateTenantMembership({
        user,
        tenantId,
        requiredRole: requiredTenantRole,
      });
      tenant = result.tenant;
      tenantMember = result.tenantMember;
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : String(authError);
      const isPermissionError =
        errorMessage.includes('INSUFFICIENT') ||
        errorMessage.includes('NOT_MEMBER') ||
        errorMessage.includes('permissions');
      if (isPermissionError) {
        // Fire-and-forget — never block auth flow due to logging failure
        AuditLogService.log({
          tenantId,
          actorId: user.userId,
          actorType: 'USER',
          action: AuditActions.PERMISSION_DENIED,
          metadata: {
            requiredRole: requiredTenantRole,
            userId: user.userId,
            reason: errorMessage,
          },
        }).catch(() => {});
      }
      throw authError;
    }

    // Step 5: Attach to request
    request.tenant = tenant;
    request.tenantMember = tenantMember;

    // Step 6: Push tenantId / userId into the observability scope so any
    // log / metric / Sentry event from here on auto-inherits them.
    ObservabilityService.setTags({ tenantId, userId: user.userId });

    return { user, userSession, tenant, tenantMember, isGlobalAdmin: false };
  }

  /**
   * Helper method to get all user's tenants (wrapper for core service)
   * @param userId - The user ID
   * @returns List of tenants the user is a member of
   */
  static async getUserTenants(userId: string): Promise<Array<{
    tenant: SafeTenant;
    tenantMember: SafeTenantMember;
  }>> {
    return TenantSessionService.getUserTenants(userId);
  }

  /**
   * Clear tenant cache for a specific user and tenant (wrapper for core service)
   * @param userId - The user ID
   * @param tenantId - The tenant ID
   */
  static async clearTenantCache(userId: string, tenantId: string): Promise<void> {
    return TenantSessionService.clearTenantCache(userId, tenantId);
  }

  /**
   * Clear all tenant caches for a user (wrapper for core service)
   * @param userId - The user ID
   */
  static async clearUserTenantCaches(userId: string): Promise<void> {
    return TenantSessionService.clearUserTenantCaches(userId);
  }

  /**
   * Check if user has required role in tenant (wrapper for core service)
   * @param memberRole - The user's role in the tenant
   * @param requiredRole - The required role
   * @returns true if user has required role or higher
   */
  static hasRequiredRole(memberRole: TenantMemberRole, requiredRole: TenantMemberRole): boolean {
    return TenantSessionService.hasRequiredRole(memberRole, requiredRole);
  }

  /**
   * Authenticate as a root-tenant member with the given role (default ADMIN).
   *
   * Super-admin = a TenantMember of the root tenant (ROOT_TENANT_ID) whose
   * memberRole satisfies `requiredRole`. Replaces the legacy
   * `userRole === 'ADMIN'` check; cross-tenant impersonation/global-admin
   * bypass is intentionally disabled here because the root tenant *is* the
   * super-admin scope.
   *
   * Use in admin API routes that previously sat under `/system/api/...`.
   */
  static async authenticateRootTenantAdmin({
    request,
    requiredRole = 'ADMIN',
    otpVerifyBypass = false,
  }: {
    request: NextRequest;
    requiredRole?: TenantMemberRole;
    otpVerifyBypass?: boolean;
  }): Promise<{
    user: SafeUser;
    userSession: SafeUserSession;
    tenant: SafeTenant;
    tenantMember: SafeTenantMember;
  }> {
    const result = await this.authenticateTenantByRequest({
      request,
      tenantId: ROOT_TENANT_ID,
      requiredTenantRole: requiredRole,
      otpVerifyBypass,
      allowGlobalAdmin: false,
    });
    return {
      user: result.user,
      userSession: result.userSession,
      tenant: result.tenant,
      tenantMember: result.tenantMember,
    };
  }
}
