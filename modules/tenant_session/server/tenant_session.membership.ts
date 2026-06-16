import 'reflect-metadata';
import { IsNull, In } from 'typeorm';
import { tenantDataSourceFor, getDataSource } from '@nb/db';
import { Tenant as TenantEntity } from '@nb/tenant/server/entities/tenant.entity';
import { TenantMember as TenantMemberEntity } from '@nb/tenant_member/server/entities/tenant_member.entity';
import redis from '@nb/redis';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { SafeTenant, SafeTenantSchema } from '@nb/tenant/server/tenant.types';
import { SafeTenantMember, SafeTenantMemberSchema } from '@nb/tenant_member/server/tenant_member.types';
import TenantAuthMessages from './tenant_session.messages';
import type { TenantMemberRole } from '@nb/tenant_member/server/tenant_member.enums';

const ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

export function hasRequiredRole(memberRole: TenantMemberRole, requiredRole: TenantMemberRole): boolean {
  return ROLE_HIERARCHY.indexOf(memberRole) <= ROLE_HIERARCHY.indexOf(requiredRole);
}

export async function getTenantById(tenantId: string): Promise<SafeTenant | null> {
  const ds = await tenantDataSourceFor(tenantId);
  const tenant = await ds.getRepository(TenantEntity).findOne({ where: { tenantId } });
  return tenant ? SafeTenantSchema.parse(tenant) : null;
}

export async function getTenantMembership(tenantId: string, userId: string): Promise<SafeTenantMember | null> {
  const ds = await tenantDataSourceFor(tenantId);
  const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantId, userId, deletedAt: IsNull() } });
  return member ? SafeTenantMemberSchema.parse(member) : null;
}

export function validateTenantStatus(tenant: SafeTenant): void {
  if (tenant.tenantStatus === 'INACTIVE') throw new AppError(TenantAuthMessages.TENANT_INACTIVE, 403, ErrorCode.FORBIDDEN);
  if (tenant.tenantStatus === 'SUSPENDED') throw new AppError(TenantAuthMessages.TENANT_SUSPENDED, 403, ErrorCode.TENANT_SUSPENDED);
}

export function validateMemberStatus(tenantMember: SafeTenantMember): void {
  if (tenantMember.memberStatus === 'INACTIVE') throw new AppError(TenantAuthMessages.MEMBER_INACTIVE, 403, ErrorCode.FORBIDDEN);
  if (tenantMember.memberStatus === 'SUSPENDED') throw new AppError(TenantAuthMessages.MEMBER_SUSPENDED, 403, ErrorCode.FORBIDDEN);
  if (tenantMember.memberStatus === 'PENDING') throw new AppError(TenantAuthMessages.MEMBER_PENDING, 403, ErrorCode.FORBIDDEN);
}

/**
 * Batched, single-query tenant resolution for a user's memberships. Tenant
 * rows live in the canonical registry (system datasource), so we load all of
 * them with one `IN (...)` query instead of issuing one round-trip per
 * membership (the previous N+1 loop).
 */
export async function getUserTenants(userId: string): Promise<Array<{ tenant: SafeTenant; tenantMember: SafeTenantMember }>> {
  const ds = await getDataSource();
  const members = await ds.getRepository(TenantMemberEntity).find({
    where: { userId, memberStatus: 'ACTIVE', deletedAt: IsNull() },
  });
  if (members.length === 0) return [];

  const tenantIds = [...new Set(members.map((m) => m.tenantId))];
  const tenants = await ds.getRepository(TenantEntity).find({ where: { tenantId: In(tenantIds) } });
  const byId = new Map(tenants.map((t) => [t.tenantId, t]));

  const results: Array<{ tenant: SafeTenant; tenantMember: SafeTenantMember }> = [];
  for (const m of members) {
    const tenant = byId.get(m.tenantId);
    if (tenant && tenant.tenantStatus === 'ACTIVE') {
      results.push({ tenant: SafeTenantSchema.parse(tenant), tenantMember: SafeTenantMemberSchema.parse(m) });
    }
  }
  return results;
}

export async function clearTenantCache(userId: string, tenantId: string): Promise<void> {
  await redis.del(`tenant:member:${userId}:${tenantId}`);
}

/**
 * Invalidate every cached membership for a user. Uses a non-blocking `SCAN`
 * cursor + `UNLINK` instead of the O(N) blocking `KEYS` command so a power
 * user's cache flush can't stall the shared Redis instance.
 */
export async function clearUserTenantCaches(userId: string): Promise<void> {
  const pattern = `tenant:member:${userId}:*`;
  let cursor = '0';
  do {
    try {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await redis.unlink(...keys).catch(() => {});
    } catch {
      break; // fail-open: skip flush if Redis is unavailable
    }
  } while (cursor !== '0');
}
