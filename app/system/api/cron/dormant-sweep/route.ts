import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/modules/env';
import AuthService from '@/modules/auth/auth.service';
import Logger from '@/modules/logger';

// POST /system/api/cron/dormant-sweep
// KD-15: disable accounts dormant for more than the configured days
// (default 90). Protected by Bearer token matching CRON_SECRET.
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
    const { scanned, disabled } = await AuthService.disableDormantAccounts();
    Logger.info(`[Cron:dormant-sweep] scanned=${scanned} disabled=${disabled}`);
    return NextResponse.json({ success: true, scanned, disabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Cron:dormant-sweep] Failed: ${message}`);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
