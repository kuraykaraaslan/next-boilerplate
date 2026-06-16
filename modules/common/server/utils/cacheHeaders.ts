/**
 * Shared Cache-Control presets for public, read-only API route handlers.
 *
 * These let CDNs (and the browser) serve cached responses while a fresh copy
 * is fetched in the background (`stale-while-revalidate`), cutting repeated DB
 * hits for content that changes infrequently. Apply ONLY to endpoints that are
 * public and have no per-user/auth-dependent body.
 *
 * Usage:
 *   import { PUBLIC_CACHE } from '@nb/common/server/utils/cacheHeaders'
 *   return NextResponse.json(data, { headers: PUBLIC_CACHE.short })
 *
 * If the request carries a search/filter query you may prefer NO_STORE so the
 * permutations don't pollute the CDN cache.
 */

function cacheControl(sMaxAge: number, swr: number): { 'Cache-Control': string } {
  return { 'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}` };
}

export const PUBLIC_CACHE = {
  /** Lists that change often (product/blog listings): ~5 min edge cache. */
  short: cacheControl(300, 1800),
  /** Detail docs and settings: ~10 min edge cache. */
  medium: cacheControl(600, 3600),
  /** Near-static reference data (pricing plans, branding): ~30 min edge cache. */
  long: cacheControl(1800, 86400),
} as const;

export const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;
