// Internal capability broker endpoint — the creds-holding side of the plugin
// runtime. ONLY the plugin-host (token-authenticated) calls this; it must be exposed
// on a private/loopback interface, never the public internet. Runs the scoped data/
// http/settings/... operation and returns the result.
import { NextRequest, NextResponse } from 'next/server';
import { loadRuntimeConfig, tokensMatch, type BrokerRequest } from '@kuraykaraaslan/plugin_runtime/server/rpc/protocol';
import { dispatch } from '@kuraykaraaslan/plugin_runtime/server/broker/broker.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cfg = loadRuntimeConfig();
  const auth = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!tokensMatch(auth, cfg.brokerToken)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: BrokerRequest;
  try {
    body = (await request.json()) as BrokerRequest;
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  try {
    const value = await dispatch(
      {
        tenantId: body.tenantId,
        pluginId: body.pluginId,
        capabilities: body.capabilities,
        httpAllowlist: body.httpAllowlist ?? [],
        limits: body.limits ?? { httpTimeoutMs: cfg.defaultLimits.httpTimeoutMs, httpMaxBytes: cfg.defaultLimits.httpMaxBytes },
      },
      body.capability,
      body.method,
      body.args ?? [],
    );
    return NextResponse.json({ value });
  } catch (e: any) {
    // Capability errors return 200 with { error } so the host bridge surfaces them
    // to the plugin as a thrown Error (not a transport failure).
    return NextResponse.json({ error: e?.message ?? 'capability failed' });
  }
}
