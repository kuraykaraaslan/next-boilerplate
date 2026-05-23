import { NextRequest, NextResponse } from 'next/server';
import SSLProvisioningService from '@/modules/tenant_domain/ssl_provisioning.service';
import Logger from '@/modules/logger';

/**
 * GET /api/internal/caddy-ask?domain=example.com
 *
 * Reverse-proxy hook for Caddy's `on_demand_tls.ask` directive. Caddy
 * issues this request before attempting to provision a TLS certificate
 * for an arbitrary hostname; we return 200 only when the hostname is a
 * verified custom domain registered against an ACTIVE tenant. Anything
 * else gets a 4xx, which prevents Let's Encrypt rate-limit exhaustion
 * from random clients pointing DNS at us.
 *
 * Optional Bearer auth: set `CADDY_ASK_SECRET` in the environment to
 * require Caddy to forward `Authorization: Bearer <secret>` (recommended
 * in production so only the trusted proxy can hit this).
 *
 * Caddyfile excerpt:
 *
 *     {
 *       on_demand_tls {
 *         ask http://app:3000/api/internal/caddy-ask
 *       }
 *     }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requiredSecret = process.env.CADDY_ASK_SECRET;
  if (requiredSecret) {
    const header = request.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token !== requiredSecret) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }
  }

  // Caddy passes the hostname as ?domain=... — we ALSO accept the
  // `Host` header / `host` query for forward-compat with Traefik etc.
  const url = new URL(request.url);
  const domain =
    url.searchParams.get('domain')
    ?? url.searchParams.get('host')
    ?? request.headers.get('x-forwarded-host')
    ?? '';

  const allowed = await SSLProvisioningService.isProvisioningAllowed(domain);
  if (!allowed) {
    Logger.info(`[caddy-ask] refused: ${domain}`);
    return NextResponse.json({ ok: false, domain }, { status: 404 });
  }

  return NextResponse.json({ ok: true, domain });
}
