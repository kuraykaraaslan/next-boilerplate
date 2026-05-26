import { NextResponse } from 'next/server';
import { getDataSource } from '@/modules/db';
import redis from '@/modules/redis';
import { env } from '@/modules/env';

/**
 * GET /internal/api/ready
 *
 * Readiness probe — the process is considered ready when the DB and Redis
 * answer. Returns 503 if any check fails, so a k8s/LB will pull the pod
 * out of rotation until the dependency recovers.
 *
 * Lightweight: no per-tenant DB ping (that's `/tenant/[id]/api/health`).
 */
export const dynamic = 'force-dynamic';

interface Check {
  status: 'ok' | 'error';
  latencyMs: number;
  message?: string;
}

async function pingDb(): Promise<Check> {
  const t0 = Date.now();
  try {
    const ds = await getDataSource();
    await ds.query('SELECT 1');
    return { status: 'ok', latencyMs: Date.now() - t0 };
  } catch (e: any) {
    return { status: 'error', latencyMs: Date.now() - t0, message: e?.message ?? 'unknown' };
  }
}

async function pingRedis(): Promise<Check> {
  const t0 = Date.now();
  try {
    await redis.ping();
    return { status: 'ok', latencyMs: Date.now() - t0 };
  } catch (e: any) {
    return { status: 'error', latencyMs: Date.now() - t0, message: e?.message ?? 'unknown' };
  }
}

export async function GET(): Promise<NextResponse> {
  const [db, redisCheck] = await Promise.all([pingDb(), pingRedis()]);

  const ready = db.status === 'ok' && redisCheck.status === 'ok';

  return NextResponse.json(
    {
      status: ready ? 'ready' : 'not_ready',
      version: env.APPLICATION_VERSION,
      timestamp: new Date().toISOString(),
      checks: { db, redis: redisCheck },
    },
    { status: ready ? 200 : 503 },
  );
}
