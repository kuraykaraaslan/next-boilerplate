import { NextRequest, NextResponse } from 'next/server';
import { env } from '@nb/env';
import TenantDeletionService from '@nb/tenant/server/tenant.deletion.service';
import Logger from '@nb/logger';

/**
 * POST /tenant/[tenantId]/api/cron/purge-expired-tenants
 * Hard-deletes tenants whose 30-day grace period has elapsed. Protected by
 * Bearer token matching CRON_SECRET. The route accepts any `tenantId` in the
 * URL because the job is platform-wide — the path is just where serverless
 * crons can reach it; call it on the root tenant.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    Logger.warn('[Cron:tenant-purge] CRON_SECRET not configured — endpoint disabled');
    return NextResponse.json({ success: false, message: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== cronSecret) {
    Logger.warn('[Cron:tenant-purge] Unauthorized attempt');
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const purged = await TenantDeletionService.purgeExpiredTenants();
    Logger.info(`[Cron:tenant-purge] purged=${purged}`);
    return NextResponse.json({ success: true, purged });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Cron:tenant-purge] Failed: ${message}`);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
