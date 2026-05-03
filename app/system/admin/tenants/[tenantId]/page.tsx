'use client';
import { use } from 'react';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faGlobe, faPeopleGroup, faBan, faGear } from '@fortawesome/free-solid-svg-icons';

export default function TenantDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tenant = {
    id: tenantId,
    name: 'Acme Corp',
    slug: 'acme-corp',
    status: 'ACTIVE' as const,
    createdAt: '2024-01-10',
    memberCount: 12,
    domains: ['acme-corp.example.com'],
    subscription: { plan: 'Pro', expiresAt: '2025-01-10' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a
          href="/system/admin/tenants"
          className="text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
        </a>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{tenant.name}</h1>
          <p className="text-sm text-text-secondary mt-0.5">Tenant ID: {tenantId}</p>
        </div>
        <Badge variant={tenant.status === 'ACTIVE' ? 'success' : 'error'} dot className="ml-2">
          {tenant.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Details">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-text-secondary mb-0.5">Name</dt>
                <dd className="text-text-primary font-medium">{tenant.name}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Slug</dt>
                <dd className="text-text-primary font-medium font-mono text-xs">{tenant.slug}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Members</dt>
                <dd className="text-text-primary font-medium">{tenant.memberCount}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Created</dt>
                <dd className="text-text-primary font-medium">{tenant.createdAt}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Custom Domains" headerRight={
            <Button size="sm" variant="outline" iconLeft={<FontAwesomeIcon icon={faGlobe} />}>
              Add Domain
            </Button>
          }>
            <div className="space-y-2">
              {tenant.domains.map((domain) => (
                <div key={domain} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-mono text-text-primary">{domain}</span>
                  <Badge variant="success" dot>Verified</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Subscription">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">{tenant.subscription.plan} Plan</p>
                <p className="text-xs text-text-secondary mt-0.5">Expires {tenant.subscription.expiresAt}</p>
              </div>
              <Badge variant="primary">{tenant.subscription.plan}</Badge>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Actions">
            <div className="space-y-2">
              <a href={`/tenant/${tenant.slug}/admin/members`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faPeopleGroup} />}>
                  View Members
                </Button>
              </a>
              <a href={`/tenant/${tenant.slug}/admin/settings`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faGear} />}>
                  Tenant Settings
                </Button>
              </a>
              <Button variant="danger" fullWidth iconLeft={<FontAwesomeIcon icon={faBan} />}>
                Suspend Tenant
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
