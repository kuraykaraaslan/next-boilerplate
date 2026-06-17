'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
import type { TenantStatus } from '@kuraykaraaslan/tenant/server/tenant.enums';

type HealthStatus = 'active' | 'trialing' | 'past_due' | 'grace_period' | 'suspended' | 'pending_deletion' | 'no_subscription' | 'expired';

type Tenant = {
  tenantId: string;
  name: string;
  description: string | null;
  tenantStatus: TenantStatus;
  healthStatus: HealthStatus;
  createdAt: string;
};

const PAGE_SIZE = 20;

const statusVariant: Record<TenantStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'neutral',
  PENDING:  'warning',
  SUSPENDED:'warning',
  DELETED:  'error',
  ARCHIVED: 'neutral',
};

const healthVariant: Record<HealthStatus, 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
  active:            'success',
  trialing:          'info',
  grace_period:      'warning',
  past_due:          'warning',
  suspended:         'error',
  pending_deletion:  'error',
  no_subscription:   'neutral',
  expired:           'error',
};

const columns: TableColumn<Tenant>[] = [
  {
    key: 'name',
    header: 'Organization',
    render: (t) => (
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary text-sm font-bold shrink-0">
          {t.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="font-medium text-text-primary">{t.name}</p>
          {t.description && (
            <p className="text-xs text-text-secondary truncate max-w-xs">{t.description}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'tenantStatus',
    header: 'Status',
    render: (t) => (
      <Badge variant={statusVariant[t.tenantStatus]} dot>
        {t.tenantStatus}
      </Badge>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (t) => (
      <span className="text-text-secondary">
        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
      </span>
    ),
  },
  {
    key: 'healthStatus',
    header: 'Health',
    render: (t) => (
      <Badge variant={healthVariant[t.healthStatus ?? 'no_subscription']} dot>
        {(t.healthStatus ?? 'no_subscription').replace(/_/g, ' ')}
      </Badge>
    ),
  },
  {
    key: '_actions',
    header: '',
    align: 'right',
    render: () => (
      <span className="text-xs text-primary hover:underline">Manage</span>
    ),
  },
];

export default function TenantsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showCreate, setShowCreate]     = useState(false);
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState('');
  const [createValues, setCreateValues] = useState({ name: '', description: '' });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchTenants = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/tenants`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined },
      });
      setTenants(res.data.tenants ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setFetchError(e.response?.data?.message ?? e.message ?? 'Failed to load tenants.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchTenants(1, search); }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, fetchTenants]);

  useEffect(() => {
    fetchTenants(page, search);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api.post(`/tenant/${tenantId}/api/tenants`, {
        name: createValues.name.trim(),
        description: createValues.description.trim() || undefined,
      });
      setShowCreate(false);
      setCreateValues({ name: '', description: '' });
      fetchTenants(1, search);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setCreateError(e.response?.data?.message ?? e.message ?? 'Failed to create tenant.');
    } finally {
      setCreating(false);
    }
  }

  function closeCreate() {
    setShowCreate(false);
    setCreateError('');
    setCreateValues({ name: '', description: '' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Tenants</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {loading ? '…' : `${total} organization${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Button iconLeft={<FontAwesomeIcon icon={faPlus} />} onClick={() => setShowCreate(true)}>
          Create Tenant
        </Button>
      </div>

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={tenants}
        getRowKey={(t) => t.tenantId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(t) => { window.location.href = `/tenant/${tenantId}/admin/tenants/${t.tenantId}`; }}
        loading={loading}
        emptyMessage="No tenants found."
        toolbar={
          <div className="pb-4">
            <Input
              id="tenant-search"
              label="Search"
              placeholder="Search by name…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <Modal
        open={showCreate}
        onClose={closeCreate}
        title="Create Tenant"
        description="Set up a new tenant organization"
        footer={
          <>
            <Button variant="ghost" onClick={closeCreate} disabled={creating}>Cancel</Button>
            <Button form="create-tenant-form" type="submit" loading={creating}>Create</Button>
          </>
        }
      >
        <form id="create-tenant-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}
          <Input
            id="tenant-name"
            label="Organization Name"
            required
            placeholder="Acme Corp"
            value={createValues.name}
            onChange={(e) => setCreateValues((v) => ({ ...v, name: e.target.value }))}
          />
          <Input
            id="tenant-desc"
            label="Description"
            placeholder="Optional description"
            value={createValues.description}
            onChange={(e) => setCreateValues((v) => ({ ...v, description: e.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
}
