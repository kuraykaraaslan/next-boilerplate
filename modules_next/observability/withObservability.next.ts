import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import Logger from '@/modules/logger';
import ObservabilityService from '@/modules/observability';

/**
 * Wrap a Next.js route handler so that:
 *
 *  1. Every `Logger.info/warn/error` call inside the handler is tagged with
 *     `[tenant=… user=… req=…]` automatically (AsyncLocalStorage).
 *  2. Sentry scope receives `tenantId` / `requestId` tags.
 *  3. The Prometheus `http_requests_total` counter + `http_request_duration_seconds`
 *     histogram are bumped on every response — success or failure.
 *  4. Thrown errors are captured by Sentry (re-thrown so the framework still
 *     returns 500). Caught responses with status ≥ 500 also increment the
 *     errors counter.
 *
 * @example
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: Promise<{ tenantId: string }> },
 * ) {
 *   const { tenantId } = await params;
 *   return withObservability(
 *     request,
 *     async () => { ... },
 *     { tenantId, route: '/api/tenant/[tenantId]/api/health' },
 *   );
 * }
 */
export async function withObservability(
  request: NextRequest,
  handler: () => Promise<NextResponse | Response>,
  opts: { tenantId?: string; route?: string } = {},
): Promise<NextResponse | Response> {
  const tenantId = opts.tenantId ?? extractTenantIdFromUrl(request.url);
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const route = opts.route ?? request.nextUrl.pathname;
  const method = request.method;
  const t0 = Date.now();

  return Logger.runWithContext({ tenantId, requestId }, async () => {
    ObservabilityService.setTags({ tenantId, requestId });

    let response: NextResponse | Response | undefined;
    try {
      response = await handler();
      return response;
    } catch (err) {
      ObservabilityService.recordError(err instanceof Error ? err : new Error(String(err)), {
        tenantId,
        extra: { route, method, requestId },
      });
      throw err;
    } finally {
      const status = response?.status ?? 500;
      ObservabilityService.recordHttpRequest({
        tenantId,
        route,
        method,
        status,
        latencyMs: Date.now() - t0,
      });
    }
  });
}

/** Pull `[tenantId]` from `/tenant/<uuid>/...` path segments. */
function extractTenantIdFromUrl(url: string): string | undefined {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/^\/tenant\/([^/]+)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}
