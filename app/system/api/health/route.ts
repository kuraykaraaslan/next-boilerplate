import { NextResponse } from 'next/server';
import { SystemDataSource, getDefaultTenantDataSource } from '@/libs/typeorm';
import redis from '@/libs/redis';
import { Queue } from 'bullmq';
import { getBullMQConnection } from '@/libs/redis/bullmq';

type CheckStatus = 'ok' | 'error';

interface ServiceCheck {
  status: CheckStatus;
  latencyMs: number;
  message?: string;
}

interface QueueCheck {
  status: CheckStatus;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  message?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    system_db: ServiceCheck;
    tenant_db: ServiceCheck;
    redis: ServiceCheck;
    queues: Record<string, QueueCheck>;
  };
}

async function checkDb(name: 'system' | 'tenant'): Promise<ServiceCheck> {
  const t0 = Date.now();
  try {
    if (name === 'system') {
      if (!SystemDataSource.isInitialized) await SystemDataSource.initialize();
      await SystemDataSource.query('SELECT 1');
    } else {
      const ds = await getDefaultTenantDataSource();
      await ds.query('SELECT 1');
    }
    return { status: 'ok', latencyMs: Date.now() - t0 };
  } catch (e: any) {
    return { status: 'error', latencyMs: Date.now() - t0, message: e.message };
  }
}

async function checkRedis(): Promise<ServiceCheck> {
  const t0 = Date.now();
  try {
    await redis.ping();
    return { status: 'ok', latencyMs: Date.now() - t0 };
  } catch (e: any) {
    return { status: 'error', latencyMs: Date.now() - t0, message: e.message };
  }
}

async function checkQueue(name: string): Promise<QueueCheck> {
  try {
    const q = new Queue(name, { connection: getBullMQConnection() });
    const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    await q.close();
    return {
      status: 'ok',
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    };
  } catch (e: any) {
    return { status: 'error', waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, message: e.message };
  }
}

const QUEUE_NAMES = ['mailQueue', 'webhookDeliveryQueue', 'systemWebhookDeliveryQueue', 'subscription-expire'];

export async function GET() {
  const [system_db, tenant_db, redisCheck, ...queueChecks] = await Promise.all([
    checkDb('system'),
    checkDb('tenant'),
    checkRedis(),
    ...QUEUE_NAMES.map(checkQueue),
  ]);

  const queues: Record<string, QueueCheck> = {};
  QUEUE_NAMES.forEach((name, i) => { queues[name] = queueChecks[i]; });

  const coreOk = system_db.status === 'ok' && tenant_db.status === 'ok' && redisCheck.status === 'ok';
  const queuesOk = Object.values(queues).every((q) => q.status === 'ok');

  const overallStatus: HealthResponse['status'] = coreOk
    ? (queuesOk ? 'healthy' : 'degraded')
    : 'unhealthy';

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    checks: {
      system_db,
      tenant_db,
      redis: redisCheck,
      queues,
    },
  };

  return NextResponse.json(body, { status: overallStatus === 'unhealthy' ? 503 : 200 });
}
