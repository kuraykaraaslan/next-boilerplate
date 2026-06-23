'use client';
import { use, useCallback, useEffect, useState } from 'react';
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
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

type Movement = {
  movementId: string;
  stockItemId: string;
  type: string;
  quantity: number;
  reason?: string | null;
  createdAt: string;
};

type Form = { stockItemId: string; type: string; quantity: string; reason: string };
const EMPTY: Form = { stockItemId: '', type: 'IN', quantity: '0', reason: '' };
const TYPE_OPTIONS = [
  { value: 'IN', label: 'IN' },
  { value: 'OUT', label: 'OUT' },
  { value: 'TRANSFER', label: 'TRANSFER' },
  { value: 'ADJUSTMENT', label: 'ADJUSTMENT' },
];
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function InventoryMovementsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [rows, setRows] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/tenant/${tenantId}/api/inventory/movements`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load movements.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() { setForm(EMPTY); setFormError(''); setModalOpen(true); }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      stockItemId: form.stockItemId,
      type: form.type,
      quantity: Number(form.quantity),
      reason: form.reason || undefined,
    };
    try {
      await api.post(base, payload);
      toast.success('Movement created');
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save movement.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(m: Movement) {
    if (!window.confirm('Delete this movement?')) return;
    try {
      await api.delete(`${base}/${m.movementId}`);
      toast.success('Movement deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete movement.'));
    }
  }

  const columns: TableColumn<Movement>[] = [
    { key: 'stockItemId', header: 'Stock Item', render: (m) => <span className="text-text-secondary">{m.stockItemId}</span> },
    { key: 'type', header: 'Type', render: (m) => <span className="font-medium text-text-primary">{m.type}</span> },
    { key: 'quantity', header: 'Quantity', render: (m) => <span className="tabular-nums text-text-secondary">{m.quantity}</span> },
    { key: 'reason', header: 'Reason', render: (m) => <span className="text-text-secondary">{m.reason ?? '—'}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (m) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(m) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movements"
        subtitle={loading ? '…' : `${total} movement${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Movement</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(m) => m.movementId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No movements yet."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Movement"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="mv-stock" label="Stock Item ID" required value={form.stockItemId}
            onChange={(e) => setForm((f) => ({ ...f, stockItemId: e.target.value }))} />
          <Select id="mv-type" label="Type" options={TYPE_OPTIONS}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
          <Input id="mv-qty" label="Quantity" type="number" required value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          <Input id="mv-reason" label="Reason" value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
