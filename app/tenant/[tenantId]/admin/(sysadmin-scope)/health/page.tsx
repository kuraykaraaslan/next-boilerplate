'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { ServerDataTable } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faServer, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/modules_next/common/utils/cn';
import {
  type HealthData, type ServiceCheck, type QueueRow,
  formatUptime, formatTimestamp, overallConfig,
} from './health.types';
import { queueColumns } from './health-queue-columns';

const AUTO_REFRESH_INTERVAL = 30_000;

function ServiceRow({ label, check, icon }: { label: string; check: ServiceCheck; icon: any }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <span className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
          check.status === 'ok' ? 'bg-success-subtle text-success-fg' : 'bg-error-subtle text-error-fg'
        )}>
          <FontAwesomeIcon icon={icon} className="w-4 h-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-text-primary">{label}</p>
          {check.message && (
            <p className="text-xs text-error mt-0.5 font-mono">{check.message}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-text-secondary tabular-nums">{check.latencyMs} ms</span>
        <Badge variant={check.status === 'ok' ? 'success' : 'error'} dot>
          {check.status === 'ok' ? 'OK' : 'Error'}
        </Badge>
      </div>
    </div>
  );
}

export default function HealthPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const [data,      setData]      = useState<HealthData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<HealthData>(`/tenant/${tenantId}/api/health`);
      setData(res.data);
      setLastCheck(new Date().toISOString());
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message ?? 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchHealth]);

  const cfg = data ? overallConfig[data.status] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        subtitle="Real-time status of databases, cache and queues"
        badge={cfg && <Badge variant={cfg.variant} dot>{cfg.label}</Badge>}
        actions={[{
          label: (
            <span className="flex items-center gap-2">
              <FontAwesomeIcon icon={faRotateRight} className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Refresh
            </span>
          ),
          onClick: fetchHealth,
          variant: 'outline',
          disabled: loading,
        }]}
      />

      {error && <AlertBanner variant="error" message={error} />}

      {data && cfg && (
        <div className={cn(
          'flex items-center gap-4 rounded-xl border px-5 py-4',
          data.status === 'healthy'   && 'bg-success-subtle border-success/30',
          data.status === 'degraded'  && 'bg-warning-subtle border-warning/30',
          data.status === 'unhealthy' && 'bg-error-subtle border-error/30',
        )}>
          <FontAwesomeIcon
            icon={cfg.icon}
            className={cn(
              'w-6 h-6 shrink-0',
              data.status === 'healthy'   && 'text-success-fg',
              data.status === 'degraded'  && 'text-warning-fg',
              data.status === 'unhealthy' && 'text-error-fg',
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              All systems {data.status === 'healthy' ? 'operational' : data.status === 'degraded' ? 'partially degraded' : 'down'}
            </p>
            {lastCheck && (
              <p className="text-xs text-text-secondary mt-0.5">
                Last checked: {formatTimestamp(lastCheck)} · Auto-refreshes every 30s
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-text-secondary">Uptime</p>
            <p className="text-sm font-semibold text-text-primary tabular-nums">{formatUptime(data.uptimeSeconds)}</p>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      )}

      {data && (
        <>
          <Card title="Core Services" subtitle="Database and cache connectivity">
            <div className="divide-y divide-border">
              <ServiceRow label="System Database (PostgreSQL)" check={data.checks.system_db} icon={faDatabase} />
              <ServiceRow label="Tenant Database (PostgreSQL)"  check={data.checks.tenant_db} icon={faDatabase} />
              <ServiceRow label="Redis"                         check={data.checks.redis}     icon={faServer}   />
            </div>
          </Card>

          <ServerDataTable
            columns={queueColumns}
            rows={Object.entries(data.checks.queues).map(([name, queue]) => ({ name, queue } as QueueRow))}
            getRowKey={(r) => r.name}
            page={1} totalPages={1} onPageChange={() => {}} hidePagination
            title="Job Queues"
            subtitle="BullMQ queue job counts"
            headerRight={
              <span className="text-xs text-text-secondary">
                {Object.values(data.checks.queues).filter((q) => q.status === 'ok').length}
                /{Object.keys(data.checks.queues).length} queues healthy
              </span>
            }
            emptyMessage="No queues configured."
          />

          <Card title="Environment" subtitle="Runtime information">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoTile label="Node.js" value={process.versions?.node ?? '—'} />
              <InfoTile label="Timestamp" value={formatTimestamp(data.timestamp)} />
              <InfoTile label="Uptime" value={formatUptime(data.uptimeSeconds)} />
              <InfoTile
                label="Overall Status"
                value={data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                valueClass={cn(
                  data.status === 'healthy'   && 'text-success-fg',
                  data.status === 'degraded'  && 'text-warning-fg',
                  data.status === 'unhealthy' && 'text-error-fg',
                )}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function InfoTile({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg bg-surface-base border border-border px-4 py-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={cn('text-sm font-semibold text-text-primary mt-0.5 truncate', valueClass)}>{value}</p>
    </div>
  );
}
