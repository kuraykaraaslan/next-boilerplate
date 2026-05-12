'use client';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faCircle } from '@fortawesome/free-solid-svg-icons';

type Service = {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  uptime: string;
  version: string;
  region: string;
};

const services: Service[] = [
  { name: 'API Gateway',        status: 'HEALTHY',  uptime: '99.98%', version: 'v2.1.4', region: 'us-east-1' },
  { name: 'Auth Service',       status: 'HEALTHY',  uptime: '99.95%', version: 'v1.8.2', region: 'us-east-1' },
  { name: 'Notification Queue', status: 'DEGRADED', uptime: '97.20%', version: 'v1.2.0', region: 'eu-west-1' },
  { name: 'Storage Service',    status: 'HEALTHY',  uptime: '100%',   version: 'v3.0.1', region: 'us-east-1' },
  { name: 'Worker Cluster',     status: 'DOWN',     uptime: '0%',     version: 'v1.5.0', region: 'ap-south-1' },
];

const statusVariant: Record<Service['status'], 'success' | 'warning' | 'error'> = {
  HEALTHY:  'success',
  DEGRADED: 'warning',
  DOWN:     'error',
};

const statColor: Record<Service['status'], string> = {
  HEALTHY:  'text-success',
  DEGRADED: 'text-warning',
  DOWN:     'text-error',
};

export default function FleetPage() {
  const healthy  = services.filter((s) => s.status === 'HEALTHY').length;
  const degraded = services.filter((s) => s.status === 'DEGRADED').length;
  const down     = services.filter((s) => s.status === 'DOWN').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Fleet" subtitle="Monitor all infrastructure services" />

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

      <Card title="Services" subtitle={`${services.length} services monitored`}>
        <div className="overflow-x-auto -mx-6 -mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Service</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Uptime</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Version</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((service) => (
                <tr key={service.name} className="hover:bg-surface-overlay transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faServer} className="w-4 h-4 text-text-secondary shrink-0" />
                      <span className="font-medium text-text-primary">{service.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant[service.status]} dot>{service.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-text-primary font-mono text-xs">{service.uptime}</td>
                  <td className="px-6 py-4 text-text-secondary font-mono text-xs">{service.version}</td>
                  <td className="px-6 py-4 text-text-secondary text-xs">{service.region}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
