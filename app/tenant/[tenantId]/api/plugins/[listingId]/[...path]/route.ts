// Public entry point for community-plugin HTTP handlers:
//   /tenant/[tenantId]/api/plugins/[listingId]/<plugin path>
// More specific than the module dispatcher (app/tenant/[tenantId]/api/[...slug]),
// so Next routes plugin traffic here. Authenticates the tenant, resolves the
// installed+active+approved plugin, hands the isolate a SANITIZED request (never a
// raw NextRequest / cookies / auth header), and returns the plugin's JSON response.
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import { resolveRunnablePlugin } from '@kuraykaraaslan/marketplace/server/plugin-resolve';
import { runOnHost } from '@kuraykaraaslan/plugin_runtime/server/rpc/host-client';

const FORWARD_HEADERS = ['content-type', 'accept', 'accept-language', 'user-agent'];

type Ctx = { params: Promise<{ tenantId: string; listingId: string; path?: string[] }> };

async function handle(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const rl = await Limiter.checkRateLimit(request, 'api');
  if (rl) return rl;
  const { tenantId, listingId, path = [] } = await ctx.params;

  try {
    // Any tenant member may call a plugin endpoint; the plugin itself is sandboxed.
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'USER' });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Unauthorized' }, { status: 401 });
  }

  const runnable = await resolveRunnablePlugin(tenantId, listingId);
  if (!runnable) return NextResponse.json({ message: 'Plugin not installed or unavailable' }, { status: 404 });

  // Sanitize the request crossing into the isolate.
  const url = new URL(request.url);
  const headers: Record<string, string> = {};
  for (const h of FORWARD_HEADERS) { const v = request.headers.get(h); if (v) headers[h] = v; }
  let body: unknown = null;
  if (!['GET', 'HEAD'].includes(request.method)) {
    const ct = request.headers.get('content-type') ?? '';
    try { body = ct.includes('application/json') ? await request.json() : await request.text(); } catch { body = null; }
  }
  const pluginReq = {
    method: request.method,
    path: path.join('/'),
    query: Object.fromEntries(url.searchParams),
    headers,
    body,
  };

  try {
    const resultJson = await runOnHost({
      tenantId,
      sandbox: runnable.sandbox,
      kind: 'http',
      target: `${request.method} ${pluginReq.path}`,
      payloadJson: JSON.stringify(pluginReq),
      getBundle: runnable.getBundle,
    });
    const res = JSON.parse(resultJson) as { status?: number; body?: unknown };
    return NextResponse.json(res.body ?? null, { status: res.status ?? 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? 'Plugin execution failed' }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
