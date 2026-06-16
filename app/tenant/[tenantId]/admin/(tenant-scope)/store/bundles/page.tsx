'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@nb/common/server/axios';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/server-data-table.component';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Select } from '@nb/common/ui/select.component';
import { Modal } from '@nb/common/ui/modal.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { RowActionsMenu } from '@nb/common/ui/row-actions-menu.component';
import { toast } from '@nb/common/ui/toast.store';
import { BundleStatusBadge, type BundleStatus } from '@nb/store/ui/product-status-badge.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Bundle = {
  bundleId: string;
  name: string;
  slug: string;
  bundlePrice?: number | null;
  discountPercent?: number | null;
  currency: string;
  status: BundleStatus;
  createdAt: string;
};

type CreateForm = { name: string; slug: string; currency: string };
const EMPTY_FORM: CreateForm = { name: '', slug: '', currency: 'USD' };
const PAGE_SIZE = 20;

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function StoreBundlesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]       = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchBundles = useCallback(async (p: number, q: string, st: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/bundles`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined, status: st || undefined },
      });
      setBundles(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load bundles.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { setPage(1); fetchBundles(1, search, status); }, [status]);
  useEffect(() => { fetchBundles(page, search, status); }, [page]);

  function handleSearch(v: string) { setSearch(v); setPage(1); fetchBundles(1, v, status); }

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/store/bundles`, {
        name: form.name,
        slug: form.slug || slugify(form.name),
        currency: form.currency,
        status: 'DRAFT',
      });
      toast.success('Bundle created');
      setShowCreate(false); setForm(EMPTY_FORM);
      router.push(`/tenant/${tenantId}/admin/store/bundles/${res.data.bundle.bundleId}`);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create bundle.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(bundleId: string, name: string) {
    if (!confirm(`Delete bundle "${name}"?`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/bundles/${bundleId}`);
      toast.success('Bundle deleted');
      fetchBundles(page, search, status);
    } catch (err) { toast.error(extractMessage(err, 'Failed to delete.')); }
  }

  const statusOptions = [
    { value: '', label: 'All' }, { value: 'DRAFT', label: 'Draft' },
    { value: 'ACTIVE', label: 'Active' }, { value: 'ARCHIVED', label: 'Archived' }, { value: 'SCHEDULED', label: 'Scheduled' },
  ];

  const columns: TableColumn<Bundle>[] = [
    {
      key: 'name', header: 'Bundle',
      render: (b) => (
        <div>
          <p className="font-medium text-text-primary">{b.name}</p>
          <p className="text-xs text-text-secondary">{b.slug}</p>
        </div>
      ),
    },
    {
      key: 'price', header: 'Price',
      render: (b) => b.bundlePrice != null
        ? <span className="tabular-nums">{b.bundlePrice} {b.currency}</span>
        : <span className="text-text-secondary text-xs">Auto</span>,
    },
    {
      key: 'discount', header: 'Discount',
      render: (b) => b.discountPercent != null ? <span>{b.discountPercent}%</span> : <span className="text-text-secondary">—</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (b) => <BundleStatusBadge status={b.status} size="sm" dot />,
    },
    {
      key: 'createdAt', header: 'Created',
      render: (b) => <span className="text-text-secondary">{new Date(b.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (b) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => router.push(`/tenant/${tenantId}/admin/store/bundles/${b.bundleId}`) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(b.bundleId, b.name) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bundles"
        subtitle={loading ? '…' : `${total} bundle${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Bundle</>, onClick: () => setShowCreate(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={bundles}
        getRowKey={(b) => b.bundleId}
        page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(b) => router.push(`/tenant/${tenantId}/admin/store/bundles/${b.bundleId}`)}
        loading={loading}
        emptyMessage="No bundles yet."
        toolbar={
          <div className="flex flex-wrap gap-3 pb-4">
            <div className="flex-1 min-w-48">
              <Input id="bun-search" label="Search" placeholder="Search bundles…"
                prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
                value={search} onChange={(e) => handleSearch(e.target.value)} />
            </div>
            <div className="min-w-40">
              <Select id="bun-status" label="Status" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
          </div>
        }
      />

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); setFormError(''); }}
        title="New Bundle"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} loading={saving}>Create &amp; Edit</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="b-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} />
          <Input id="b-slug" label="Slug" required value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <Input id="b-cur" label="Currency" value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase().slice(0, 3) }))} />
        </div>
      </Modal>
    </div>
  );
}
