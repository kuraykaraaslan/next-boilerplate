'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faCircle, faDatabase, faLayerGroup, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/modules_next/common/utils/cn';

type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';

type ServiceRow = {
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

type HealthData = {
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

const AUTO_REFRESH_INTERVAL = 30_000;

const statusVariant: Record<ServiceStatus, 'success' | 'warning' | 'error'> = {
  HEALTHY:  'success',
  DEGRADED: 'warning',
  DOWN:     'error',
};

const statColor: Record<ServiceStatus, string> = {
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

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function buildServices(data: HealthData): ServiceRow[] {
  const rows: ServiceRow[] = [
    {
      name:     'System Database',
      category: 'Database',
      status:   deriveServiceStatus(data.checks.system_db),
      detail:   `${data.checks.system_db.latencyMs} ms`,
      icon:     faDatabase,
      message:  data.checks.system_db.message,
    },
    {
      name:     'Tenant Database',
      category: 'Database',
      status:   deriveServiceStatus(data.checks.tenant_db),
      detail:   `${data.checks.tenant_db.latencyMs} ms`,
      icon:     faDatabase,
      message:  data.checks.tenant_db.message,
    },
    {
      name:     'Redis',
      category: 'Cache',
      status:   deriveServiceStatus(data.checks.redis),
      detail:   `${data.checks.redis.latencyMs} ms`,
      icon:     faServer,
      message:  data.checks.redis.message,
    },
  ];

  for (const [queueName, queue] of Object.entries(data.checks.queues)) {
    rows.push({
      name:     queueName,
      category: 'Queue',
      status:   deriveQueueStatus(queue),
      detail:   `${queue.waiting} waiting · ${queue.active} active · ${queue.failed} failed`,
      icon:     faLayerGroup,
      message:  queue.message,
    });
  }

  return rows;
}

export default function FleetPage() {
  const [services, setServices]   = useState<ServiceRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchFleet = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get<HealthData>('/system/api/health');
      setServices(buildServices(res.data));
      setLastChecked(new Date().toISOString());
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load fleet status.'));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
    const id = setInterval(fetchFleet, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchFleet]);

  const healthy  = services.filter((s) => s.status === 'HEALTHY').length;
  const degraded = services.filter((s) => s.status === 'DEGRADED').length;
  const down     = services.filter((s) => s.status === 'DOWN').length;

  const columns: TableColumn<ServiceRow>[] = [
    {
      key: 'name',
      header: 'Service',
      render: (s) => (
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={s.icon} className="w-4 h-4 text-text-secondary shrink-0" />
          <div>
            <p className="font-medium text-text-primary">{s.name}</p>
            {s.message && (
              <p className="text-xs text-error mt-0.5 font-mono">{s.message}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (s) => <Badge variant="neutral">{s.category}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <Badge variant={statusVariant[s.status]} dot>{s.status}</Badge>,
    },
    {
      key: 'detail',
      header: 'Detail',
      render: (s) => <span className="font-mono text-xs text-text-secondary">{s.detail}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet"
        subtitle={lastChecked
          ? `Last checked: ${new Date(lastChecked).toLocaleTimeString()} · Auto-refreshes every 30s`
          : 'Monitor all infrastructure services'}
        actions={[
          {
            label: (
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faRotateRight} className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                Refresh
              </span>
            ),
            onClick: fetchFleet,
            variant: 'outline',
            disabled: loading,
          },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCircle} className={`${statColor.HEALTHY} w-3 h-3`} />
            <div>
              <p className="text-2xl font-bold text-text-primary">{healthy}</p>
              <p className="text-xs text-text-secondary">Healthy</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCircle} className={`${statColor.DEGRADED} w-3 h-3`} />
            <div>
              <p className="text-2xl font-bold text-text-primary">{degraded}</p>
              <p className="text-xs text-text-secondary">Degraded</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCircle} className={`${statColor.DOWN} w-3 h-3`} />
            <div>
              <p className="text-2xl font-bold text-text-primary">{down}</p>
              <p className="text-xs text-text-secondary">Down</p>
            </div>
          </div>
        </Card>
      </div>

      <ServerDataTable
        columns={columns}
        rows={services}
        getRowKey={(s) => `${s.category}:${s.name}`}
        page={1}
        totalPages={1}
        total={services.length}
        onPageChange={() => {}}
        loading={loading}
        emptyMessage="No services available."
        hidePagination
        title="Services"
        subtitle={`${services.length} service${services.length !== 1 ? 's' : ''} monitored`}
      />
    </div>
  );
}
