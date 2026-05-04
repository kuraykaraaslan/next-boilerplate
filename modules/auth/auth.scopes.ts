import type { UserRole } from '@/modules/user/user.enums';
import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums';

export type SystemScope = 'system:read' | 'system:write' | 'system:admin';
export type TenantScope = 'tenant:read' | 'tenant:write' | 'tenant:admin' | 'tenant:owner';
export type AuthScope = SystemScope | TenantScope;

const SYSTEM_SCOPE_MAP: Record<UserRole, SystemScope[]> = {
  USER: ['system:read'],
  ADMIN: ['system:read', 'system:write', 'system:admin'],
};

const TENANT_SCOPE_MAP: Record<TenantMemberRole, TenantScope[]> = {
  USER: ['tenant:read'],
  ADMIN: ['tenant:read', 'tenant:write', 'tenant:admin'],
  OWNER: ['tenant:read', 'tenant:write', 'tenant:admin', 'tenant:owner'],
};

export function resolveSystemScopes(userRole: UserRole): AuthScope[] {
  return SYSTEM_SCOPE_MAP[userRole] ?? [];
}

export function resolveTenantScopes(memberRole: TenantMemberRole): AuthScope[] {
  return TENANT_SCOPE_MAP[memberRole] ?? [];
}

export function hasRequiredScopes(granted: AuthScope[], required: AuthScope[]): boolean {
  return required.every((scope) => granted.includes(scope));
}
