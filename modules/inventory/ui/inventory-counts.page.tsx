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
import { CountStatusBadge } from '@kuraykaraaslan/inventory/ui/count-status-badge.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Count = {
  countId: string;
  warehouseId: string;
  status: string;
  createdAt: string;
};

type Form = { warehouseId: string; status: string };
const EMPTY: Form = { warehouseId: '', status: 'OPEN' };
const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'OPEN' },
  { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
  { value: 'CLOSED', label: 'CLOSED' },
];
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function InventoryCountsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<Count[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/tenant/${tenantId}/api/inventory/counts`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load counts.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() { setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(c: Count) {
    setEditingId(c.countId);
    setForm({ warehouseId: c.warehouseId ?? '', status: c.status ?? 'OPEN' });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = { warehouseId: form.warehouseId, status: form.status };
    try {
      if (editingId) await api.patch(`${base}/${editingId}`, payload);
      else await api.post(base, payload);
      toast.success(editingId ? 'Count updated' : 'Count created');
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save count.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(c: Count) {
    if (!window.confirm('Delete this count?')) return;
    try {
      await api.delete(`${base}/${c.countId}`);
      toast.success('Count deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete count.'));
    }
  }

  const columns: TableColumn<Count>[] = [
    { key: 'warehouseId', header: 'Warehouse', render: (c) => <span className="text-text-secondary">{c.warehouseId}</span> },
    { key: 'status', header: 'Status', render: (c) => <CountStatusBadge status={c.status} /> },
    { key: 'createdAt', header: 'Created', render: (c) => <span className="text-text-secondary">{new Date(c.createdAt).toLocaleDateString()}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(c) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(c) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counts"
        subtitle={loading ? '…' : `${total} count${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Count</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(c) => c.countId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(c) => router.push(`/tenant/${tenantId}/admin/inventory/counts/${c.countId}`)}
        loading={loading}
        emptyMessage="No counts yet."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Count' : 'New Count'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editingId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="ct-wh" label="Warehouse ID" required value={form.warehouseId}
            onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))} />
          <Select id="ct-status" label="Status" options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
