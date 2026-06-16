// React's `cache` is a server-side request-memoization API (not a component/hook),
// so it is a legitimate server-layer dependency here.
// eslint-disable-next-line no-restricted-imports
import { cache } from 'react';
import type { Metadata } from 'next';
import TenantBrandingService from '@nb/tenant_branding/server/tenant_branding.service';

/** Fallback brand name when a tenant hasn't configured one (or lookup fails). */
export const DEFAULT_APP_NAME = 'Next Boilerplate';

/**
 * Per-request tenant brand name, pulled from tenant_branding. Wrapped in
 * React `cache()` so the multiple layout `generateMetadata` calls in a single
 * route render share one lookup (which itself is Redis-cached in the service).
 */
const brandName = cache(async (tenantId: string): Promise<string> => {
  try {
    const branding = await TenantBrandingService.get(tenantId);
    return branding.brandName?.trim() || DEFAULT_APP_NAME;
  } catch {
    return DEFAULT_APP_NAME;
  }
});

type TenantMetadataProps = { params: Promise<{ tenantId: string }> };

/**
 * Builds a `generateMetadata` function that sets an absolute browser-tab title
 * of `"<title> | <tenant brand name>"`, where the brand name comes from the
 * tenant's branding settings at request time.
 *
 * Uses `title.absolute` rather than a plain string so the result is correct
 * regardless of how many parent layouts sit between the route and the root —
 * an intermediate layout that sets its own string title would otherwise consume
 * the root `title.template` and stop it cascading to deeper routes.
 */
export function pageTitle(title: string) {
  return async ({ params }: TenantMetadataProps): Promise<Metadata> => {
    const { tenantId } = await params;
    return { title: { absolute: `${title} | ${await brandName(tenantId)}` } };
  };
}
