import { NextResponse } from 'next/server';
import { env } from '@nb/env';

/**
 * GET /internal/api/health
 *
 * Liveness probe — k8s / load-balancer compatible. Only checks that the
 * process is up and responsive; no DB or Redis ping (those would block
 * the probe behind a slow query). For readiness (DB + Redis up?), use
 * `/internal/api/ready`.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: 'alive',
      version: env.APPLICATION_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
