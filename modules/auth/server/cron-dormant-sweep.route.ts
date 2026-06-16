import { NextRequest, NextResponse } from 'next/server';
import { env } from '@nb/env';
import AuthService from '@nb/auth/server/auth.service';
import Logger from '@nb/logger';

// POST /tenant/[tenantId]/api/cron/dormant-sweep
// Protected by Bearer token matching CRON_SECRET.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    Logger.warn('[Cron:dormant-sweep] CRON_SECRET not configured — endpoint disabled');
    return NextResponse.json({ success: false, message: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== cronSecret) {
    Logger.warn('[Cron:dormant-sweep] Unauthorized attempt');
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { scanned, disabled, erased } = await AuthService.disableDormantAccounts();
    Logger.info(`[Cron:dormant-sweep] scanned=${scanned} disabled=${disabled} erased=${erased}`);
    return NextResponse.json({ success: true, scanned, disabled, erased });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Cron:dormant-sweep] Failed: ${message}`);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
