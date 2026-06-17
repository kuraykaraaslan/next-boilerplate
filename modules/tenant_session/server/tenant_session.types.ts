import type { SafeTenant } from '@kuraykaraaslan/tenant/server/tenant.types';
import type { SafeTenantMember } from '@kuraykaraaslan/tenant_member/server/tenant_member.types';
import type { SafeUser } from '@kuraykaraaslan/user/server/user.types';
import type { TenantMemberRole } from '@kuraykaraaslan/tenant_member/server/tenant_member.enums';

/** Typed tenant-session context propagated to route handlers. */
export interface TenantSessionContext {
  tenant: SafeTenant;
  tenantMember: SafeTenantMember;
  user: SafeUser;
  role: TenantMemberRole;
}

/** Optional per-request signals for session-resolution security checks. */
export interface TenantSessionRequestContext {
  ip?: string | null;
  userAgent?: string | null;
  /** Whether the user has satisfied MFA this session (drives 2FA enforcement). */
  mfaVerified?: boolean;
  /** ISO country of the request IP, when known (geo anomaly detection). */
  country?: string | null;
  /** Stable per-device/session id used for concurrent-session accounting. */
  sessionId?: string | null;
}
