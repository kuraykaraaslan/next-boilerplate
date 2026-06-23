'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash, faGear } from '@fortawesome/free-solid-svg-icons';

type RedirectRule = {
  redirectId: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean;
  hits: number;
  createdAt: string;
};

type Form = { fromPath: string; toPath: string; statusCode: string; isActive: string };
const EMPTY_FORM: Form = { fromPath: '', toPath: '', statusCode: '301', isActive: 'false' };

const PAGE_SIZE = 50;
const STATUS_OPTIONS = [
  { value: '301', label: '301 (Permanent)' },
  { value: '302', label: '302 (Found)' },
  { value: '307', label: '307 (Temporary)' },
  { value: '308', label: '308 (Permanent Redirect)' },
];
const BOOL_OPTIONS = [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function RedirectsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<RedirectRule[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RedirectRule | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/redirects`, {
        params: { page: p - 1, pageSize: PAGE_SIZE },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load redirects.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  const displayed = search
    ? rows.filter((r) => r.fromPath.toLowerCase().includes(search.toLowerCase()) || r.toPath.toLowerCase().includes(search.toLowerCase()))
    : rows;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(r: RedirectRule) {
    setEditing(r);
    setForm({ fromPath: r.fromPath, toPath: r.toPath, statusCode: String(r.statusCode), isActive: String(r.isActive) });
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      fromPath: form.fromPath,
      toPath: form.toPath,
      statusCode: Number(form.statusCode),
      isActive: form.isActive === 'true',
    };
    try {
      if (editing) {
        await api.patch(`/tenant/${tenantId}/api/redirects/${editing.redirectId}`, payload);
        toast.success('Redirect updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/redirects`, payload);
        toast.success('Redirect created');
      }
      closeModal();
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save redirect.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: RedirectRule) {
    if (!window.confirm(`Delete redirect "${r.fromPath}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/redirects/${r.redirectId}`);
      toast.success('Redirect deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete redirect.'));
    }
  }

  const columns: TableColumn<RedirectRule>[] = [
    { key: 'fromPath', header: 'From', render: (r) => <span className="font-medium text-text-primary">{r.fromPath}</span> },
    { key: 'toPath', header: 'To', render: (r) => <span className="text-text-secondary">{r.toPath}</span> },
    { key: 'statusCode', header: 'Status', render: (r) => <span className="tabular-nums text-text-secondary">{r.statusCode}</span> },
    { key: 'isActive', header: 'Active', render: (r) => <span className="text-text-secondary">{r.isActive ? 'Yes' : 'No'}</span> },
    { key: 'hits', header: 'Hits', render: (r) => <span className="tabular-nums text-text-secondary">{r.hits}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(r) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redirects"
        subtitle={loading ? '…' : `${total} redirect${total !== 1 ? 's' : ''}`}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/redirects/settings`, variant: 'ghost' as const },
          { label: <><FontAwesomeIcon icon={faPlus} /> New Redirect</>, onClick: openCreate },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={displayed}
        getRowKey={(r) => r.redirectId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No redirects yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="redirect-search"
              label="Search"
              placeholder="Filter by from or to path…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Redirect' : 'New Redirect'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="redirect-from" label="From Path" required value={form.fromPath}
            onChange={(e) => setForm((f) => ({ ...f, fromPath: e.target.value }))}
            hint="e.g. /old-page" />
          <Input id="redirect-to" label="To Path" required value={form.toPath}
            onChange={(e) => setForm((f) => ({ ...f, toPath: e.target.value }))}
            hint="e.g. /new-page" />
          <Select id="redirect-status" label="Status Code" options={STATUS_OPTIONS}
            value={form.statusCode} onChange={(e) => setForm((f) => ({ ...f, statusCode: e.target.value }))} />
          <Select id="redirect-active" label="Active" options={BOOL_OPTIONS}
            value={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
