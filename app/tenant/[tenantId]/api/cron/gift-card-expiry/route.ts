import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/modules/env';
import { getDataSource } from '@/modules/db';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { expireGiftCardsForTenant } from '@/modules/gift_card/gift_card.expiry.job';
import Logger from '@/modules/logger';

/**
 * POST /tenant/[tenantId]/api/cron/gift-card-expiry
 *
 * Serverless trigger for the gift-card expiry sweep. Iterates every active
 * tenant and flips gift cards past their `expiresAt` (still holding balance) to
 * EXPIRED, writing a ledger row and dispatching `gift_card.expired`. Idempotent.
 *
 * Protected by Bearer token matching `CRON_SECRET`. Path tenantId is the
 * caller's tenant (typically root) and irrelevant to the work performed.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    Logger.warn('[Cron:gift-card-expiry] CRON_SECRET not configured — endpoint disabled');
    return NextResponse.json({ success: false, message: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== cronSecret) {
    Logger.warn('[Cron:gift-card-expiry] Unauthorized attempt');
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ds = await getDataSource();
    const tenants = await ds.getRepository(Tenant).find({ where: { tenantStatus: 'ACTIVE' } });

    let expired = 0;
    for (const t of tenants) {
      try {
        expired += await expireGiftCardsForTenant(t.tenantId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        Logger.warn(`[Cron:gift-card-expiry] failed for ${t.tenantId}: ${message}`);
      }
    }

    Logger.info(`[Cron:gift-card-expiry] expired=${expired} tenants=${tenants.length}`);
    return NextResponse.json({ success: true, expired, total: tenants.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Cron:gift-card-expiry] Failed: ${message}`);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
