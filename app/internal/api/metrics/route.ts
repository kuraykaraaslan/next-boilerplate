import { NextRequest, NextResponse } from 'next/server';
import { env } from '@kuraykaraaslan/env';
import ObservabilityService from '@kuraykaraaslan/observability';

/**
 * GET /internal/api/metrics
 *
 * Prometheus scrape endpoint. Returns the active registry's text output, or
 * 404 when `METRICS_ENABLED=false`. When `METRICS_SECRET` is set, callers
 * must present `Authorization: Bearer <secret>`.
 *
 * Reachable without tenant prefix — see `proxy.ts` `/internal/api/*` carve-out.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse | Response> {
  if (!env.METRICS_ENABLED) {
    return NextResponse.json({ error: 'metrics disabled' }, { status: 404 });
  }

  if (env.METRICS_SECRET) {
    const header = request.headers.get('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (token !== env.METRICS_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  // Lazy init — first scrape after boot may pay the cost of bringing
  // prom-client up. Subsequent calls are cheap.
  await ObservabilityService.init();
  const registry = ObservabilityService.getMetricsRegistry();
  if (!registry) {
    return NextResponse.json(
      { error: 'metrics not initialised — install prom-client and restart' },
      { status: 503 },
    );
  }

  const body = await registry.metrics();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': registry.contentType,
      'Cache-Control': 'no-store',
    },
  });
}
