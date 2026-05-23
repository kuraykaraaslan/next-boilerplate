import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/modules/env';
import DNSVerificationService from '@/modules/tenant_domain/dns_verification.service';
import Logger from '@/modules/logger';

/**
 * POST /tenant/[tenantId]/api/cron/dns-recheck
 * Re-resolves every ACTIVE tenant domain and flips broken ones to
 * `DNS_FAILED`. Protected by Bearer token matching CRON_SECRET. The route
 * accepts any `tenantId` in the URL because the job is platform-wide — the
 * path is just where serverless crons can reach it; call it on the root tenant.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    Logger.warn('[Cron:dns-recheck] CRON_SECRET not configured — endpoint disabled');
    return NextResponse.json({ success: false, message: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== cronSecret) {
    Logger.warn('[Cron:dns-recheck] Unauthorized attempt');
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { checked, downgraded } = await DNSVerificationService.recheckActiveDomains();
    Logger.info(`[Cron:dns-recheck] checked=${checked} downgraded=${downgraded}`);
    return NextResponse.json({ success: true, checked, downgraded });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Cron:dns-recheck] Failed: ${message}`);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
