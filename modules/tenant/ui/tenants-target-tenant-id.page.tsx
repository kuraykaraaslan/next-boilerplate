'use client';
import { use, useEffect, useState } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { isRootTenant } from '@nb/tenant/server/tenant.constants';
import api from '@nb/common/server/axios';
import { Card } from '@nb/common/ui/card.component';
import { Badge } from '@nb/common/ui/badge.component';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Spinner } from '@nb/common/ui/spinner.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { Modal } from '@nb/common/ui/modal.component';
import { Breadcrumb } from '@nb/common/ui/breadcrumb.component';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/server-data-table.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobe, faPeopleGroup, faGear,
  faTrash, faCheck, faBan, faCreditCard,
} from '@fortawesome/free-solid-svg-icons';
import type { TenantStatus } from '@nb/tenant/server/tenant.enums';
import type { DomainStatus as _DS } from '@nb/tenant_domain/server/tenant_domain.enums';
import { TenantMembersTable } from '@nb/tenant/ui/tenant-members-table.component';
import { TenantSubscriptionCard } from '@nb/tenant/ui/tenant-subscription-card.component';

type DomainStatus = Exclude<_DS, 'DNS_FAILED'>;

type Domain = {
  tenantDomainId: string;
  domain: string;
  isPrimary: boolean;
  domainStatus: DomainStatus;
  createdAt: string | null;
};

type Tenant = {
  tenantId: string;
  name: string;
  description: string | null;
  tenantStatus: TenantStatus;
  createdAt: string | null;
  updatedAt: string | null;
  domains?: Domain[] | null;
};

const statusVariant: Record<TenantStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success', INACTIVE: 'neutral', PENDING: 'warning',
  SUSPENDED: 'warning', DELETED: 'error', ARCHIVED: 'neutral',
};

const domainStatusVariant: Record<DomainStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success', VERIFIED: 'success', PENDING: 'warning', INACTIVE: 'neutral',
};

const selectClass =
  'h-9 rounded-lg border border-border bg-surface-base px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus w-full';

export default function TenantDetailPage({ params }: { params: Promise<{ tenantId: string; targetTenantId: string }> }) {
  const { tenantId, targetTenantId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const router = useRouter();

  const [tenant, setTenant]     = useState<Tenant | null>(null);
  const [loading, setLoading]   = useState(true);
  const [pageError, setPageError] = useState('');

  const [showEdit, setShowEdit] = useState(false);
  const [editValues, setEditValues] = useState({ name: '', description: '', tenantStatus: 'ACTIVE' as TenantStatus });
  const [saving, setSaving]     = useState(false);
  const [editError, setEditError] = useState('');

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/tenant/${tenantId}/api/tenants/${targetTenantId}`)
      .then((res) => setTenant(res.data.tenant))
      .catch((err) => setPageError(err.response?.data?.message ?? err.message ?? 'Failed to load tenant.'))
      .finally(() => setLoading(false));
  }, [tenantId, targetTenantId]);

  function openEdit() {
    if (!tenant) return;
    setEditValues({ name: tenant.name, description: tenant.description ?? '', tenantStatus: tenant.tenantStatus });
    setEditError('');
    setShowEdit(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setEditError('');
    try {
      const res = await api.put(`/tenant/${tenantId}/api/tenants/${targetTenantId}`, {
        name: editValues.name,
        description: editValues.description || null,
        tenantStatus: editValues.tenantStatus,
      });
      setTenant(res.data.tenant);
      setShowEdit(false);
    } catch (err: any) {
      setEditError(err.response?.data?.message ?? err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: TenantStatus) {
    try {
      const res = await api.put(`/tenant/${tenantId}/api/tenants/${targetTenantId}`, { tenantStatus: newStatus });
      setTenant(res.data.tenant);
    } catch (err: any) {
      setPageError(err.response?.data?.message ?? err.message ?? 'Failed to update status.');
    }
  }

  async function handleDelete() {
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/tenants/${targetTenantId}`);
      router.push(`/tenant/${tenantId}/admin/tenants`);
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? err.message ?? 'Failed to delete tenant.');
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (pageError || !tenant) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Tenants', href: `/tenant/${tenantId}/admin/tenants` }, { label: 'Tenant' }]} />
        <AlertBanner variant="error" message={pageError || 'Tenant not found.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Tenants', href: `/tenant/${tenantId}/admin/tenants` }, { label: tenant.name }]} />

      <PageHeader
        title={tenant.name}
        subtitle={tenant.tenantId}
        badge={<Badge variant={statusVariant[tenant.tenantStatus]} dot>{tenant.tenantStatus}</Badge>}
        actions={[{ label: 'Edit', variant: 'outline', onClick: openEdit }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Details">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-text-secondary mb-0.5">Name</dt>
                <dd className="text-text-primary font-medium">{tenant.name}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Status</dt>
                <dd><Badge variant={statusVariant[tenant.tenantStatus]} dot>{tenant.tenantStatus}</Badge></dd>
              </div>
              {tenant.description && (
                <div className="sm:col-span-2">
                  <dt className="text-text-secondary mb-0.5">Description</dt>
                  <dd className="text-text-primary">{tenant.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-text-secondary mb-0.5">Created</dt>
                <dd className="text-text-primary font-medium">
                  {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Last Updated</dt>
                <dd className="text-text-primary font-medium">
                  {tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleDateString() : '—'}
                </dd>
              </div>
            </dl>
          </Card>

          <TenantMembersTable targetTenantId={targetTenantId} />

          {tenant.domains && tenant.domains.length > 0 && (
            <ServerDataTable
              columns={[
                { key: 'domain', header: 'Domain', render: (d: Domain) => <span className="font-mono text-text-primary">{d.domain}</span> },
                { key: 'domainStatus', header: 'Status', render: (d: Domain) => <Badge variant={domainStatusVariant[d.domainStatus]} dot>{d.domainStatus}</Badge> },
                { key: 'isPrimary', header: 'Primary', render: (d: Domain) => d.isPrimary ? <Badge variant="primary">Primary</Badge> : null },
              ] satisfies TableColumn<Domain>[]}
              rows={tenant.domains}
              getRowKey={(d) => d.tenantDomainId}
              page={1}
              totalPages={1}
              total={tenant.domains.length}
              onPageChange={() => {}}
              hidePagination
              title="Custom Domains"
            />
          )}
        </div>

        <div className="space-y-4">
          <Card title="Actions">
            <div className="space-y-2">
              <a href={`/tenant/${targetTenantId}/admin/members`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faPeopleGroup} />}>View Members</Button>
              </a>
              <a href={`/tenant/${targetTenantId}/admin/settings`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faGear} />}>Tenant Settings</Button>
              </a>
              <a href={`/tenant/${targetTenantId}/admin/subscription`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faCreditCard} />}>Subscription</Button>
              </a>
              <a href={`/tenant/${tenantId}/admin/payments?tenantId=${targetTenantId}`}>
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faGlobe} />}>View Payments</Button>
              </a>
            </div>
          </Card>

          <TenantSubscriptionCard tenantId={tenantId} targetTenantId={targetTenantId} />

          <Card title="Status Management">
            <div className="space-y-2">
              {tenant.tenantStatus !== 'ACTIVE' && (
                <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faCheck} />} onClick={() => handleStatusChange('ACTIVE')}>
                  Set Active
                </Button>
              )}
              {tenant.tenantStatus === 'ACTIVE' && (
                <Button
                  variant="outline"
                  fullWidth
                  iconLeft={<FontAwesomeIcon icon={faBan} />}
                  onClick={() => handleStatusChange('SUSPENDED')}
                  className="!text-warning border-warning/40 hover:bg-warning/5"
                >
                  Suspend
                </Button>
              )}
              {tenant.tenantStatus !== 'ARCHIVED' && (
                <Button variant="ghost" fullWidth onClick={() => handleStatusChange('ARCHIVED')} className="!text-text-secondary">
                  Archive
                </Button>
              )}
            </div>
          </Card>

          <Card title="Danger Zone">
            <p className="text-xs text-text-secondary mb-3">
              Permanently deletes this tenant and all associated data. This cannot be undone.
            </p>
            <Button
              variant="danger"
              fullWidth
              iconLeft={<FontAwesomeIcon icon={faTrash} />}
              onClick={() => { setShowDelete(true); setDeleteError(''); }}
            >
              Delete Tenant
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Tenant"
        description={tenant.tenantId}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEdit(false)} disabled={saving}>Cancel</Button>
            <Button form="edit-tenant-form" type="submit" loading={saving}>Save</Button>
          </>
        }
      >
        <form id="edit-tenant-form" onSubmit={handleSave} className="space-y-4">
          {editError && <AlertBanner variant="error" message={editError} />}
          <Input id="edit-name" label="Name" required placeholder="Acme Corp" value={editValues.name}
            onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} />
          <Input id="edit-desc" label="Description" placeholder="Optional description" value={editValues.description}
            onChange={(e) => setEditValues((v) => ({ ...v, description: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label htmlFor="edit-status" className="text-xs font-medium text-text-secondary">Status</label>
            <select id="edit-status" value={editValues.tenantStatus}
              onChange={(e) => setEditValues((v) => ({ ...v, tenantStatus: e.target.value as TenantStatus }))}
              className={selectClass}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete Tenant"
        description={`Are you sure you want to permanently delete "${tenant.name}"? All members, domains, and data will be lost.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete Permanently</Button>
          </>
        }
      >
        {deleteError && <AlertBanner variant="error" message={deleteError} />}
      </Modal>
    </div>
  );
}
