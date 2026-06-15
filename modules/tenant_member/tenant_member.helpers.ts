import 'reflect-metadata';
import { IsNull } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { TenantMember as TenantMemberEntity } from './entities/tenant_member.entity';
import { SafeTenantMember, SafeTenantMemberSchema } from './tenant_member.types';
import type { TenantMemberRole } from './tenant_member.enums';
import SettingService from '@/modules/setting/setting.service';

export const ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

/** Resolve the tenant's `defaultMemberRole` setting (falls back to USER). */
export async function resolveDefaultRole(tenantId: string): Promise<TenantMemberRole> {
  const raw = await SettingService.getValue(tenantId, 'defaultMemberRole').catch(() => null);
  const role = (raw ?? '').toUpperCase();
  return (role === 'ADMIN' || role === 'USER' || role === 'GUEST') ? role as TenantMemberRole : 'USER';
}

export function hasRole(member: SafeTenantMember, requiredRole: TenantMemberRole): boolean {
  const memberIdx = ROLE_HIERARCHY.indexOf(member.memberRole);
  const requiredIdx = ROLE_HIERARCHY.indexOf(requiredRole);
  return memberIdx <= requiredIdx;
}

export async function checkPermission(tenantId: string, userId: string, requiredRole: TenantMemberRole): Promise<boolean> {
  const ds = await tenantDataSourceFor(tenantId);
  const member = await ds.getRepository(TenantMemberEntity).findOne({
    where: { tenantId, userId, memberStatus: 'ACTIVE', deletedAt: IsNull() },
  });
  if (!member) return false;
  return hasRole(SafeTenantMemberSchema.parse(member), requiredRole);
}
