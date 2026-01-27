import { prisma } from '@/libs/prisma';
import redis from '@/libs/redis';
import { SafeTenant, SafeTenantSchema } from '@/modules/tenant/tenant.types';
import { SafeTenantMember, SafeTenantMemberSchema } from '@/modules/tenant_member/tenant_member.types';
import { SafeUser } from '@/modules/user/user.types';
import TenantAuthMessages from './tenant_session.messages';
import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums';

const TENANT_CACHE_TTL = parseInt(process.env.TENANT_CACHE_TTL || `${60 * 5}`); // 5 min default

export default class TenantSessionService {

  private static readonly ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

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
   * Get tenant by ID
   * @param tenantId - The tenant ID
   * @returns The tenant or null
   */
  static async getTenantById(tenantId: string): Promise<SafeTenant | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) {
      return null;
    }

    return SafeTenantSchema.parse(tenant);
  }

  /**
   * Get tenant membership for a user
   * @param tenantId - The tenant ID
   * @param userId - The user ID
   * @returns The tenant member or null
   */
  static async getTenantMembership(tenantId: string, userId: string): Promise<SafeTenantMember | null> {
    const tenantMember = await prisma.tenantMember.findFirst({
      where: { tenantId, userId, deletedAt: null },
    });

    if (!tenantMember) {
      return null;
    }

    return SafeTenantMemberSchema.parse(tenantMember);
  }

  /**
   * Validate tenant status
   * @param tenant - The tenant to validate
   * @throws Error if tenant is inactive or suspended
   */
  static validateTenantStatus(tenant: SafeTenant): void {
    if (tenant.tenantStatus === 'INACTIVE') {
      throw new Error(TenantAuthMessages.TENANT_INACTIVE);
    }

    if (tenant.tenantStatus === 'SUSPENDED') {
      throw new Error(TenantAuthMessages.TENANT_SUSPENDED);
    }
  }

  /**
   * Validate tenant member status
   * @param tenantMember - The tenant member to validate
   * @throws Error if member is inactive, suspended, or pending
   */
  static validateMemberStatus(tenantMember: SafeTenantMember): void {
    if (tenantMember.memberStatus === 'INACTIVE') {
      throw new Error(TenantAuthMessages.MEMBER_INACTIVE);
    }

    if (tenantMember.memberStatus === 'SUSPENDED') {
      throw new Error(TenantAuthMessages.MEMBER_SUSPENDED);
    }

    if (tenantMember.memberStatus === 'PENDING') {
      throw new Error(TenantAuthMessages.MEMBER_PENDING);
    }
  }

  /**
   * Authenticate user's tenant membership with caching
   * @param user - The authenticated user
   * @param tenantId - The tenant ID
   * @param requiredRole - The required tenant role
   * @returns The tenant and tenant member
   */
  static async authenticateTenantMembership({
    user,
    tenantId,
    requiredRole = 'USER',
  }: {
    user: SafeUser;
    tenantId: string;
    requiredRole?: TenantMemberRole;
  }): Promise<{
    tenant: SafeTenant;
    tenantMember: SafeTenantMember;
  }> {
    // Try cache first
    const cacheKey = `tenant:member:${user.userId}:${tenantId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        if (cachedData && cachedData.tenant && cachedData.tenantMember) {
          const { tenant, tenantMember } = cachedData;

          // Verify role requirement
          if (!this.hasRequiredRole(tenantMember.memberRole, requiredRole)) {
            throw new Error(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS);
          }

          return { tenant, tenantMember };
        } else {
          // Invalid cache, delete it
          await redis.del(cacheKey);
        }
      } catch (error) {
        // Cache parsing failed, delete and continue
        await redis.del(cacheKey);
      }
    }

    // Get tenant from database
    const tenant = await this.getTenantById(tenantId);

    if (!tenant) {
      throw new Error(TenantAuthMessages.TENANT_NOT_FOUND);
    }

    // Validate tenant status
    this.validateTenantStatus(tenant);

    // Get tenant membership
    const tenantMember = await this.getTenantMembership(tenantId, user.userId);

    if (!tenantMember) {
      throw new Error(TenantAuthMessages.USER_NOT_MEMBER_OF_TENANT);
    }

    // Validate member status
    this.validateMemberStatus(tenantMember);

    // Check role requirement
    if (!this.hasRequiredRole(tenantMember.memberRole, requiredRole)) {
      throw new Error(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS);
    }

    // Cache the result
    await redis.setex(
      cacheKey,
      TENANT_CACHE_TTL,
      JSON.stringify({ tenant, tenantMember })
    );

    return { tenant, tenantMember };
  }

  /**
   * Get all tenants for a user
   * @param userId - The user ID
   * @returns List of tenants the user is a member of
   */
  static async getUserTenants(userId: string): Promise<Array<{
    tenant: SafeTenant;
    tenantMember: SafeTenantMember;
  }>> {
    const memberships = await prisma.tenantMember.findMany({
      where: {
        userId,
        memberStatus: 'ACTIVE',
      },
      include: {
        tenant: true,
      },
    });

    return memberships
      .filter(m => m.tenant.tenantStatus === 'ACTIVE')
      .map(m => ({
        tenant: SafeTenantSchema.parse(m.tenant),
        tenantMember: SafeTenantMemberSchema.parse(m),
      }));
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
