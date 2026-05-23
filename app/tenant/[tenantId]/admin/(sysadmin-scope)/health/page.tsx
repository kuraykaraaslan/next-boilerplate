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
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faServer,
  faRotateRight,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
  faCircle,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/modules_next/common/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckStatus = 'ok' | 'error';
type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';

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

interface HealthData {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const overallConfig: Record<OverallStatus, { label: string; variant: 'success' | 'warning' | 'error'; icon: any }> = {
  healthy:   { label: 'Healthy',   variant: 'success', icon: faCircleCheck      },
  degraded:  { label: 'Degraded',  variant: 'warning', icon: faTriangleExclamation },
  unhealthy: { label: 'Unhealthy', variant: 'error',   icon: faCircleXmark      },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

type QueueRow = { name: string; queue: QueueCheck };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const AUTO_REFRESH_INTERVAL = 30_000;

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
        badge={cfg && (
          <Badge variant={cfg.variant} dot>
            {cfg.label}
          </Badge>
        )}
        actions={[
          {
            label: (
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faRotateRight} className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                Refresh
              </span>
            ),
            onClick: fetchHealth,
            variant: 'outline',
            disabled: loading,
          },
        ]}
      />

      {error && <AlertBanner variant="error" message={error} />}

      {/* Overall status banner */}
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
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {data && (
        <>
          {/* Core services */}
          <Card title="Core Services" subtitle="Database and cache connectivity">
            <div className="divide-y divide-border">
              <ServiceRow label="System Database (PostgreSQL)" check={data.checks.system_db} icon={faDatabase} />
              <ServiceRow label="Tenant Database (PostgreSQL)"  check={data.checks.tenant_db} icon={faDatabase} />
              <ServiceRow label="Redis"                         check={data.checks.redis}     icon={faServer}   />
            </div>
          </Card>

          <ServerDataTable
            columns={[
              {
                key: 'name',
                header: 'Queue',
                render: (r: QueueRow) => (
                  <div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={faCircle}
                        className={cn('w-2 h-2 shrink-0', r.queue.status === 'ok' ? 'text-success' : 'text-error')}
                      />
                      <span className="text-sm font-mono text-text-primary">{r.name}</span>
                    </div>
                    {r.queue.message && (
                      <p className="text-xs text-error mt-0.5 font-mono pl-4">{r.queue.message}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'waiting',
                header: 'Waiting',
                align: 'center',
                render: (r: QueueRow) => (
                  <span className={cn('text-sm tabular-nums font-medium', r.queue.waiting > 0 ? 'text-warning-fg' : 'text-text-secondary')}>
                    {r.queue.waiting}
                  </span>
                ),
              },
              {
                key: 'active',
                header: 'Active',
                align: 'center',
                render: (r: QueueRow) => (
                  <span className={cn('text-sm tabular-nums font-medium', r.queue.active > 0 ? 'text-info' : 'text-text-secondary')}>
                    {r.queue.active}
                  </span>
                ),
              },
              {
                key: 'completed',
                header: 'Completed',
                align: 'center',
                render: (r: QueueRow) => (
                  <span className="text-sm tabular-nums text-text-secondary">{r.queue.completed}</span>
                ),
              },
              {
                key: 'failed',
                header: 'Failed',
                align: 'center',
                render: (r: QueueRow) => (
                  <span className={cn('text-sm tabular-nums font-medium', r.queue.failed > 0 ? 'text-error' : 'text-text-secondary')}>
                    {r.queue.failed}
                  </span>
                ),
              },
              {
                key: 'delayed',
                header: 'Delayed',
                align: 'center',
                render: (r: QueueRow) => (
                  <span className={cn('text-sm tabular-nums', r.queue.delayed > 0 ? 'text-warning-fg' : 'text-text-secondary')}>
                    {r.queue.delayed}
                  </span>
                ),
              },
            ] satisfies TableColumn<QueueRow>[]}
            rows={Object.entries(data.checks.queues).map(([name, queue]) => ({ name, queue }))}
            getRowKey={(r) => r.name}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
            hidePagination
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

          {/* Environment snapshot */}
          <Card title="Environment" subtitle="Runtime information">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoTile label="Node.js" value={process.versions?.node ?? '—'} />
              <InfoTile label="Timestamp" value={formatTimestamp(data.timestamp)} />
              <InfoTile label="Uptime" value={formatUptime(data.uptimeSeconds)} />
              <InfoTile
                label="Overall Status"
                value={data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                valueClass={cn(
                  data.status === 'healthy' && 'text-success-fg',
                  data.status === 'degraded' && 'text-warning-fg',
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
