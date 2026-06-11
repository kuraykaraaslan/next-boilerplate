import { faDatabase, faServer, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

export type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';

export type ServiceRow = {
  name: string;
  category: 'Database' | 'Cache' | 'Queue';
  status: ServiceStatus;
  detail: string;
  icon: typeof faDatabase;
  message?: string;
};

type CheckStatus = 'ok' | 'error';

type ServiceCheck = {
  status: CheckStatus;
  latencyMs: number;
  message?: string;
};

type QueueCheck = {
  status: CheckStatus;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  message?: string;
};

export type HealthData = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    system_db: ServiceCheck;
    tenant_db: ServiceCheck;
    redis: ServiceCheck;
    queues: Record<string, QueueCheck>;
  };
};

export const statusVariant: Record<ServiceStatus, 'success' | 'warning' | 'error'> = {
  HEALTHY:  'success',
  DEGRADED: 'warning',
  DOWN:     'error',
};

export const statColor: Record<ServiceStatus, string> = {
  HEALTHY:  'text-success',
  DEGRADED: 'text-warning',
  DOWN:     'text-error',
};

function deriveServiceStatus(check: ServiceCheck): ServiceStatus {
  if (check.status === 'error') return 'DOWN';
  if (check.latencyMs > 500) return 'DEGRADED';
  return 'HEALTHY';
}

function deriveQueueStatus(queue: QueueCheck): ServiceStatus {
  if (queue.status === 'error') return 'DOWN';
  if (queue.failed > 0) return 'DEGRADED';
  return 'HEALTHY';
}

export function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function buildServices(data: HealthData): ServiceRow[] {
  const rows: ServiceRow[] = [
    {
      name: 'System Database', category: 'Database',
      status: deriveServiceStatus(data.checks.system_db),
      detail: `${data.checks.system_db.latencyMs} ms`,
      icon: faDatabase, message: data.checks.system_db.message,
    },
    {
      name: 'Tenant Database', category: 'Database',
      status: deriveServiceStatus(data.checks.tenant_db),
      detail: `${data.checks.tenant_db.latencyMs} ms`,
      icon: faDatabase, message: data.checks.tenant_db.message,
    },
    {
      name: 'Redis', category: 'Cache',
      status: deriveServiceStatus(data.checks.redis),
      detail: `${data.checks.redis.latencyMs} ms`,
      icon: faServer, message: data.checks.redis.message,
    },
  ];

  for (const [queueName, queue] of Object.entries(data.checks.queues)) {
    rows.push({
      name: queueName, category: 'Queue',
      status: deriveQueueStatus(queue),
      detail: `${queue.waiting} waiting · ${queue.active} active · ${queue.failed} failed`,
      icon: faLayerGroup, message: queue.message,
    });
  }

  return rows;
}
