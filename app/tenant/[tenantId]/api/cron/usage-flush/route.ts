import { NextRequest, NextResponse } from 'next/server';
import { env } from '@nb/env';
import { getDataSource } from '@nb/db';
import { Tenant } from '@nb/tenant/server/entities/tenant.entity';
import { TenantUsageService } from '@nb/tenant_usage/server/tenant_usage.service';
import Logger from '@nb/logger';

/**
 * POST /tenant/[tenantId]/api/cron/usage-flush
 *
 * Iterates every active tenant and flushes their current-month Redis usage
 * counters (`apiCalls`, `aiTokens`, `storageBytes`, `emailSends`, `smsSends`)
 * into the `TenantUsage` table. Idempotent — calling repeatedly within a
 * month upserts the running totals.
 *
 * Protected by Bearer token matching `CRON_SECRET`. Path tenantId is the
 * caller's tenant (typically root) and irrelevant to the work performed.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    Logger.warn('[Cron:usage-flush] CRON_SECRET not configured — endpoint disabled');
    return NextResponse.json({ success: false, message: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== cronSecret) {
    Logger.warn('[Cron:usage-flush] Unauthorized attempt');
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ds = await getDataSource();
    const tenants = await ds.getRepository(Tenant).find({ where: { tenantStatus: 'ACTIVE' } });

    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    let flushed = 0;
    for (const t of tenants) {
      try {
        await TenantUsageService.flushToDb(t.tenantId, month);
        flushed += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.warn(`[Cron:usage-flush] flush failed for ${t.tenantId}: ${message}`);
      }
    }

    Logger.info(`[Cron:usage-flush] flushed=${flushed}/${tenants.length} month=${month}`);
    return NextResponse.json({ success: true, flushed, total: tenants.length, month });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Cron:usage-flush] Failed: ${message}`);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
