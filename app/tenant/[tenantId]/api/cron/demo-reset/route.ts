import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/modules/env';
import { resetAndRedeploy, resolveDeployTarget } from '@/modules/db/db.deploy';
import Logger from '@/modules/logger';

// Schema sync + reseed needs the full Node runtime (pg, typeorm, bcrypt, fs)
// and runs longer than the default serverless budget.
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * GET|POST /tenant/[tenantId]/api/cron/demo-reset
 *
 * DESTRUCTIVE demo reset. Drops the database schema and re-runs the full deploy
 * pipeline (schema sync → SQL migrations → bootstrap seed) so the demo returns
 * to a clean seeded state. Wired to a Vercel cron (every 15 minutes) — Vercel
 * invokes it with `Authorization: Bearer $CRON_SECRET`.
 *
 * Triple-guarded so it can never wipe a real database by accident:
 *   1. DEMO_MODE must be true.
 *   2. CRON_SECRET must be configured.
 *   3. Bearer token must match CRON_SECRET.
 *
 * The `tenantId` in the path is ignored — the job is platform-wide; the path is
 * just where serverless crons can reach it. Call it on the root tenant.
 */
async function handle(request: NextRequest): Promise<NextResponse> {
  if (!env.DEMO_MODE) {
    Logger.warn('[Cron:demo-reset] DEMO_MODE not enabled — destructive reset refused');
    return NextResponse.json(
      { success: false, message: 'Demo mode disabled' },
      { status: 403 },
    );
  }

  const cronSecret = env.CRON_SECRET;
  if (!cronSecret) {
    Logger.warn('[Cron:demo-reset] CRON_SECRET not configured — endpoint disabled');
    return NextResponse.json({ success: false, message: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || token !== cronSecret) {
    Logger.warn('[Cron:demo-reset] Unauthorized attempt');
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const target = resolveDeployTarget();
  if (!target) {
    Logger.warn('[Cron:demo-reset] DATABASE_URL not set — nothing to reset');
    return NextResponse.json({ success: false, message: 'No database configured' }, { status: 503 });
  }

  try {
    Logger.warn('[Cron:demo-reset] destructive reset starting — wiping and reseeding database');
    await resetAndRedeploy(target);
    Logger.info('[Cron:demo-reset] database reset and reseeded');
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Cron:demo-reset] Failed: ${message}`);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
