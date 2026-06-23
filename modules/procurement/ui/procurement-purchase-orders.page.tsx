'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PurchaseOrderStatusBadge } from './purchase-order-status-badge.component';
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

type PurchaseOrder = {
  purchaseOrderId: string;
  supplierId: string;
  number: string;
  status: string;
  currency?: string | null;
  total?: number | null;
  createdAt: string;
};

type Form = { supplierId: string; number: string; status: string; currency: string; total: string };
const EMPTY_FORM: Form = { supplierId: '', number: '', status: 'DRAFT', currency: '', total: '' };

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'ORDERED', label: 'ORDERED' },
  { value: 'RECEIVED', label: 'RECEIVED' },
  { value: 'CANCELLED', label: 'CANCELLED' },
];

const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function ProcurementPurchaseOrdersPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const basePath = `/tenant/${tenantId}/api/procurement/purchase-orders`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(basePath, { params: { page: p - 1, pageSize: PAGE_SIZE } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load purchase orders.'));
    } finally { setLoading(false); }
  }, [basePath]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }

  function openEdit(row: PurchaseOrder) {
    setEditing(row);
    setForm({
      supplierId: row.supplierId ?? '',
      number: row.number ?? '',
      status: row.status ?? 'DRAFT',
      currency: row.currency ?? '',
      total: row.total != null ? String(row.total) : '',
    });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      supplierId: form.supplierId,
      number: form.number,
      status: form.status,
      currency: form.currency || undefined,
      total: form.total !== '' ? Number(form.total) : undefined,
    };
    try {
      if (editing) {
        await api.patch(`${basePath}/${editing.purchaseOrderId}`, payload);
        toast.success('Purchase order updated');
      } else {
        await api.post(basePath, payload);
        toast.success('Purchase order created');
      }
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save purchase order.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(row: PurchaseOrder) {
    if (!window.confirm(`Delete purchase order "${row.number}"?`)) return;
    try {
      await api.delete(`${basePath}/${row.purchaseOrderId}`);
      toast.success('Purchase order deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete purchase order.'));
    }
  }

  const columns: TableColumn<PurchaseOrder>[] = [
    { key: 'number', header: 'Number', render: (r) => <span className="font-medium text-text-primary">{r.number}</span> },
    { key: 'supplierId', header: 'Supplier', render: (r) => <span className="text-text-secondary">{r.supplierId}</span> },
    { key: 'status', header: 'Status', render: (r) => <PurchaseOrderStatusBadge status={r.status} /> },
    { key: 'total', header: 'Total', render: (r) => <span className="tabular-nums text-text-secondary">{r.total ?? '—'}</span> },
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
        title="Purchase Orders"
        subtitle={loading ? '…' : `${total} purchase order${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Purchase Order</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.purchaseOrderId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(r) => router.push(`/tenant/${tenantId}/admin/procurement/purchase-orders/${r.purchaseOrderId}`)}
        loading={loading}
        emptyMessage="No purchase orders yet. Create one to get started."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Purchase Order' : 'New Purchase Order'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="po-supplier" label="Supplier" required value={form.supplierId}
            onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} />
          <Input id="po-number" label="Number" required value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
          <Select id="po-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          <Input id="po-currency" label="Currency" value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
          <Input id="po-total" label="Total" type="number" value={form.total}
            onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
