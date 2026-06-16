import '@testing-library/jest-dom';
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';

// ─────────────────────────────────────────────────────────────────────────────
// Tenant-aware test fixtures
//
// Re-export the platform's ROOT_TENANT_ID and a deterministic non-root demo
// tenant UUID so individual test files don't keep re-inventing fake UUIDs.
//
// Use `makeTestTenantId(seed)` when you need multiple distinct tenant IDs in
// the same test (e.g. cross-tenant isolation checks).
// ─────────────────────────────────────────────────────────────────────────────

/** The real root tenant ID — re-exported for ergonomics. */
export const TEST_ROOT_TENANT_ID = ROOT_TENANT_ID;

/** A stable, non-root tenant ID for tests that need "another tenant". */
export const TEST_TENANT_ID = '00000000-0000-4000-8000-000000000001';

/** Another stable tenant ID for cross-tenant isolation tests. */
export const TEST_OTHER_TENANT_ID = '00000000-0000-4000-8000-000000000002';

/**
 * Generate a deterministic UUID-like tenant ID from a small numeric seed
 * (1..65535). Useful when a test needs N tenants without typing N UUIDs.
 */
export function makeTestTenantId(seed: number): string {
  const hex = seed.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}
