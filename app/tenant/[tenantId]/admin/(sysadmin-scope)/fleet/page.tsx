'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { ServerDataTable } from '@/modules_next/common/ui/ServerDataTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/modules_next/common/utils/cn';
import { type ServiceRow, type HealthData, statColor, buildServices, extractMessage } from './fleet.types';
import { fleetColumns } from './fleet-columns';

const AUTO_REFRESH_INTERVAL = 30_000;

export default function FleetPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const [services, setServices]       = useState<ServiceRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchFleet = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get<HealthData>(`/tenant/${tenantId}/api/health`);
      setServices(buildServices(res.data));
      setLastChecked(new Date().toISOString());
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load fleet status.'));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchFleet();
    const id = setInterval(fetchFleet, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchFleet]);

  const healthy  = services.filter((s) => s.status === 'HEALTHY').length;
  const degraded = services.filter((s) => s.status === 'DEGRADED').length;
  const down     = services.filter((s) => s.status === 'DOWN').length;

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
        columns={fleetColumns}
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
