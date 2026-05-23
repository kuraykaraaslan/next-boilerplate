/**
 * Root tenant — the single tenant that owns platform-level configuration
 * (global users, plans, coupons, subscription plans, system audit logs,
 * platform SAML, super-admin settings).
 *
 * Replaces the previous "system scope" pseudo-tenant. Every request now
 * resolves to a real tenant row; the root tenant is just the one with
 * this fixed UUID.
 *
 * The UUID is a deterministic RFC 4122 v4 value (version nibble = 4,
 * variant nibble = 8) so it is a syntactically valid UUID v4 — every
 * `z.string().uuid()` validator accepts it without special-casing.
 *
 * Super-admin = a TenantMember of the root tenant with memberRole='ADMIN'.
 */
export const ROOT_TENANT_ID = '00000000-0000-4000-8000-000000000000';

export const ROOT_TENANT_NAME = 'Platform';

export function isRootTenant(tenantId: string | null | undefined): boolean {
  return tenantId === ROOT_TENANT_ID;
}
