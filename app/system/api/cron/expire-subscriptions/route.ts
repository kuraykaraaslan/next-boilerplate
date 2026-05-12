import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/libs/env';
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import Logger from '@/modules/logger';

// POST /system/api/cron/expire-subscriptions
// Protected by Bearer token matching CRON_SECRET env var.
// Trigger from Vercel Cron, GitHub Actions, or any external scheduler.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    Logger.warn('[Cron:expire-subscriptions] CRON_SECRET not configured — endpoint disabled');
    return NextResponse.json({ success: false, message: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== cronSecret) {
    Logger.warn('[Cron:expire-subscriptions] Unauthorized attempt');
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const expired = await TenantSubscriptionService.expireOverdueSubscriptions();
    Logger.info(`[Cron:expire-subscriptions] Expired ${expired} subscription(s)`);
    return NextResponse.json({ success: true, expired });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Cron:expire-subscriptions] Failed: ${message}`);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
