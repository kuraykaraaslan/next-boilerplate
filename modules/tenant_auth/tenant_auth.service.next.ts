import { NextRequest } from 'next/server';
import { SafeUser } from '@/modules/user/user.types';
import { SafeTenant } from '@/modules/tenant/tenant.types';
import { SafeTenantMember } from '@/modules/tenant_member/tenant_member.types';
import { SafeUserSession } from '@/modules/user_session/user_session.types';
import UserSessionNextService from '@/modules/user_session/user_session.service.next';
import TenantService from '@/modules/tenant/tenant.service';
import TenantMemberService from '@/modules/tenant_member/tenant_member.service';
import TenantAuthMessages from './tenant_auth.messages';
import redis from '@/libs/redis';
import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums';

const TENANT_CACHE_TTL = parseInt(process.env.TENANT_CACHE_TTL || `${60 * 5}`); // 5 min default

type TenantIdSource = 'header' | 'subdomain' | 'query' | 'body' | 'param';

export default class TenantAuthNextService {

  private static readonly ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

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
   * Check if user has required role in tenant based on role hierarchy
   * @param memberRole - The user's role in the tenant
   * @param requiredRole - The required role
   * @returns true if user has required role or higher
   */
  static hasRequiredRole(memberRole: TenantMemberRole, requiredRole: TenantMemberRole): boolean {
    const memberRoleIndex = this.ROLE_HIERARCHY.indexOf(memberRole);
    const requiredRoleIndex = this.ROLE_HIERARCHY.indexOf(requiredRole);
    
    // Lower index = higher role (OWNER = 0, ADMIN = 1, USER = 2)
    return memberRoleIndex <= requiredRoleIndex;
  }

  /**
   * Authenticate user and verify tenant membership with required role
   * @param request - The Next.js request object
   * @param requiredTenantRole - The required tenant role
   * @param tenantIdSource - Where to extract tenant ID from
   * @param tenantId - Optional direct tenant ID (overrides source extraction)
   * @param otpVerifyBypass - Whether to bypass OTP verification for user auth
   * @returns The authenticated user, session, tenant, and tenant member
   */
  static async authenticateTenantByRequest({
    request,
    requiredTenantRole = 'USER',
    tenantIdSource = 'header',
    tenantId: directTenantId,
    otpVerifyBypass = false,
  }: {
    request: NextRequest;
    requiredTenantRole?: TenantMemberRole;
    tenantIdSource?: TenantIdSource;
    tenantId?: string;
    otpVerifyBypass?: boolean;
  }): Promise<{
    user: SafeUser;
    userSession: SafeUserSession;
    tenant: SafeTenant;
    tenantMember: SafeTenantMember;
  }> {
    // Step 1: Authenticate user first
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

    // Step 3: Try cache first
    const cacheKey = `tenant:member:${user.userId}:${tenantId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        if (cachedData && cachedData.tenant && cachedData.tenantMember) {
          const { tenant, tenantMember } = cachedData;
          
          // Verify role requirement
          if (!this.hasRequiredRole(tenantMember.memberRole, requiredTenantRole)) {
            throw new Error(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS);
          }

          // Attach to request
          // @ts-ignore
          request.tenant = tenant;
          // @ts-ignore
          request.tenantMember = tenantMember;

          return { user, userSession, tenant, tenantMember };
        } else {
          // Invalid cache, delete it
          await redis.del(cacheKey);
        }
      } catch (error) {
        // Cache parsing failed, delete and continue
        await redis.del(cacheKey);
      }
    }

    // Step 4: Get tenant from database
    const tenant = await TenantService.getById(tenantId);

    if (!tenant) {
      throw new Error(TenantAuthMessages.TENANT_NOT_FOUND);
    }

    // Step 5: Check tenant status
    if (tenant.tenantStatus === 'INACTIVE') {
      throw new Error(TenantAuthMessages.TENANT_INACTIVE);
    }

    if (tenant.tenantStatus === 'SUSPENDED') {
      throw new Error(TenantAuthMessages.TENANT_SUSPENDED);
    }

    // Step 6: Get tenant membership
    const tenantMember = await TenantMemberService.getByTenantAndUser({
      tenantMemberId: null,
      tenantId,
      userId: user.userId,
    });

    if (!tenantMember) {
      throw new Error(TenantAuthMessages.USER_NOT_MEMBER_OF_TENANT);
    }

    // Step 7: Check member status
    if (tenantMember.memberStatus === 'INACTIVE') {
      throw new Error(TenantAuthMessages.MEMBER_INACTIVE);
    }

    if (tenantMember.memberStatus === 'SUSPENDED') {
      throw new Error(TenantAuthMessages.MEMBER_SUSPENDED);
    }

    if (tenantMember.memberStatus === 'PENDING') {
      throw new Error(TenantAuthMessages.MEMBER_PENDING);
    }

    // Step 8: Check role requirement
    if (!this.hasRequiredRole(tenantMember.memberRole, requiredTenantRole)) {
      throw new Error(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS);
    }

    // Step 9: Cache the result
    await redis.setex(
      cacheKey,
      TENANT_CACHE_TTL,
      JSON.stringify({ tenant, tenantMember })
    );

    // Step 10: Attach to request
    // @ts-ignore
    request.tenant = tenant;
    // @ts-ignore
    request.tenantMember = tenantMember;

    return { user, userSession, tenant, tenantMember };
  }

  /**
   * Helper method to get all user's tenants
   * @param userId - The user ID
   * @returns List of tenants the user is a member of
   */
  static async getUserTenants(userId: string): Promise<Array<{
    tenant: SafeTenant;
    tenantMember: SafeTenantMember;
  }>> {
    // This would need a new method in TenantMemberService to get all user's memberships
    // For now, returning empty array as placeholder
    return [];
  }

  /**
   * Clear tenant cache for a specific user and tenant
   * @param userId - The user ID
   * @param tenantId - The tenant ID
   */
  static async clearTenantCache(userId: string, tenantId: string): Promise<void> {
    const cacheKey = `tenant:member:${userId}:${tenantId}`;
    await redis.del(cacheKey);
  }

  /**
   * Clear all tenant caches for a user
   * @param userId - The user ID
   */
  static async clearUserTenantCaches(userId: string): Promise<void> {
    const pattern = `tenant:member:${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
