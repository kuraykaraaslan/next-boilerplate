import {
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

export type CheckStatus = 'ok' | 'error';
export type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ServiceCheck {
  status: CheckStatus;
  latencyMs: number;
  message?: string;
}

export interface QueueCheck {
  status: CheckStatus;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  message?: string;
}

export interface HealthData {
  status: OverallStatus;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    system_db: ServiceCheck;
    tenant_db: ServiceCheck;
    redis: ServiceCheck;
    queues: Record<string, QueueCheck>;
  };
}

export type QueueRow = { name: string; queue: QueueCheck };

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export const overallConfig: Record<OverallStatus, { label: string; variant: 'success' | 'warning' | 'error'; icon: any }> = {
  healthy:   { label: 'Healthy',   variant: 'success', icon: faCircleCheck          },
  degraded:  { label: 'Degraded',  variant: 'warning', icon: faTriangleExclamation  },
  unhealthy: { label: 'Unhealthy', variant: 'error',   icon: faCircleXmark          },
};
