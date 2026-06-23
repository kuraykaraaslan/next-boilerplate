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
import { faPlus, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type GoodsReceipt = {
  receiptId: string;
  purchaseOrderId: string;
  number: string;
  status: string;
  createdAt: string;
};

type Form = { purchaseOrderId: string; number: string; status: string };
const EMPTY_FORM: Form = { purchaseOrderId: '', number: '', status: 'DRAFT' };

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'RECEIVED', label: 'RECEIVED' },
  { value: 'CANCELLED', label: 'CANCELLED' },
];

const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function ProcurementReceiptsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [rows, setRows] = useState<GoodsReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GoodsReceipt | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const basePath = `/tenant/${tenantId}/api/procurement/receipts`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(basePath, { params: { page: p - 1, pageSize: PAGE_SIZE } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load goods receipts.'));
    } finally { setLoading(false); }
  }, [basePath]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }

  function openEdit(row: GoodsReceipt) {
    setEditing(row);
    setForm({
      purchaseOrderId: row.purchaseOrderId ?? '',
      number: row.number ?? '',
      status: row.status ?? 'DRAFT',
    });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      purchaseOrderId: form.purchaseOrderId,
      number: form.number,
      status: form.status,
    };
    try {
      if (editing) {
        await api.patch(`${basePath}/${editing.receiptId}`, payload);
        toast.success('Goods receipt updated');
      } else {
        await api.post(basePath, payload);
        toast.success('Goods receipt created');
      }
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save goods receipt.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(row: GoodsReceipt) {
    if (!window.confirm(`Delete goods receipt "${row.number}"?`)) return;
    try {
      await api.delete(`${basePath}/${row.receiptId}`);
      toast.success('Goods receipt deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete goods receipt.'));
    }
  }

  const columns: TableColumn<GoodsReceipt>[] = [
    { key: 'number', header: 'Number', render: (r) => <span className="font-medium text-text-primary">{r.number}</span> },
    { key: 'purchaseOrderId', header: 'Purchase Order', render: (r) => <span className="text-text-secondary">{r.purchaseOrderId}</span> },
    { key: 'status', header: 'Status', render: (r) => <span className="text-text-secondary">{r.status}</span> },
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
        title="Goods Receipts"
        subtitle={loading ? '…' : `${total} goods receipt${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Goods Receipt</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.receiptId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No goods receipts yet. Create one to get started."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Goods Receipt' : 'New Goods Receipt'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="gr-po" label="Purchase Order" required value={form.purchaseOrderId}
            onChange={(e) => setForm((f) => ({ ...f, purchaseOrderId: e.target.value }))} />
          <Input id="gr-number" label="Number" required value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
          <Select id="gr-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
