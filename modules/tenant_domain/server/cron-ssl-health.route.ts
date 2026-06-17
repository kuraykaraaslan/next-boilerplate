import { NextRequest, NextResponse } from 'next/server';
import { env } from '@kuraykaraaslan/env';
import SSLProvisioningService from '@kuraykaraaslan/tenant_domain/server/ssl_provisioning.service';
import Logger from '@kuraykaraaslan/logger';

/**
 * POST /tenant/[tenantId]/api/cron/ssl-health
 *
 * Probes every tenant custom domain's TLS handshake and updates
 * `sslStatus / sslIssuedAt / sslExpiresAt / sslIssuer / sslLastCheckedAt`
 * on `TenantDomain`. Protected by Bearer `CRON_SECRET`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    Logger.warn('[Cron:ssl-health] CRON_SECRET not configured — endpoint disabled');
    return NextResponse.json({ success: false, message: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== cronSecret) {
    Logger.warn('[Cron:ssl-health] Unauthorized attempt');
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await SSLProvisioningService.recheckCertificates();
    Logger.info(
      `[Cron:ssl-health] checked=${result.checked} active=${result.activated} expiring=${result.expiring} failed=${result.failed}`,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Cron:ssl-health] Failed: ${message}`);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
