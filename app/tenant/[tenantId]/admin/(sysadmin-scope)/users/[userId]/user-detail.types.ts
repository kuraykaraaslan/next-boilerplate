import type { UserRole, UserStatus } from '@/modules/user/user.enums';
import type { TenantMemberRole as MemberRole, TenantMemberStatus as MemberStatus } from '@/modules/tenant_member/tenant_member.enums';
import type { TenantStatus } from '@/modules/tenant/tenant.enums';

export type User = {
  userId: string;
  email: string;
  phone: string | null;
  userRole: UserRole;
  userStatus: UserStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type Membership = {
  tenantMemberId: string;
  tenantId: string;
  memberRole: MemberRole;
  memberStatus: MemberStatus;
  createdAt: string | null;
  tenant?: { tenantId: string; name: string; tenantStatus: TenantStatus } | null;
};

export const memberRoleVariant: Record<MemberRole, 'primary' | 'warning' | 'neutral'> = {
  OWNER: 'warning',
  ADMIN: 'primary',
  USER:  'neutral',
};

export const memberStatusVariant: Record<MemberStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE:    'success',
  INACTIVE:  'neutral',
  SUSPENDED: 'warning',
  PENDING:   'warning',
};
