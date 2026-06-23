'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

type OrderLineRow = {
  lineId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

type LineForm = { productId: string; description: string; quantity: string; unitPrice: string };
const EMPTY: LineForm = { productId: '', description: '', quantity: '1', unitPrice: '0' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  orderId: string;
  currency?: string | null;
  onRefresh: () => void;
};

export function OrderLinesPanel({ tenantId, orderId, currency, onRefresh }: Props) {
  const [rows, setRows] = useState<OrderLineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<LineForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const base = `/tenant/${tenantId}/api/orders/${orderId}/lines`;

  const fetchLines = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: 0, pageSize: 200 } });
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load lines.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchLines(); }, [fetchLines]);

  function openCreate() { setEditId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(r: OrderLineRow) {
    setEditId(r.lineId);
    setForm({
      productId: r.productId ?? '',
      description: r.description,
      quantity: String(r.quantity),
      unitPrice: String(r.unitPrice),
    });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      productId: form.productId || undefined,
      description: form.description,
      quantity: Number(form.quantity) || 1,
      unitPrice: Number(form.unitPrice) || 0,
    };
    try {
      if (editId) {
        await api.patch(`${base}/${editId}`, payload);
        toast.success('Line updated');
      } else {
        await api.post(base, payload);
        toast.success('Line added');
      }
      setModalOpen(false);
      await fetchLines();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save line.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: OrderLineRow) {
    if (!confirm(`Remove line "${r.description}"?`)) return;
    try {
      await api.delete(`${base}/${r.lineId}`);
      toast.success('Line removed');
      await fetchLines();
      onRefresh();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to remove line.'));
    }
  }

  function fmt(n: number) {
    const v = Number(n) || 0;
    if (!currency) return v.toFixed(2);
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v); }
    catch { return `${v.toFixed(2)} ${currency}`; }
  }

  const columns: TableColumn<OrderLineRow>[] = [
    { key: 'description', header: 'Description', render: (r) => <span className="font-medium text-text-primary">{r.description}</span> },
    { key: 'quantity', header: 'Qty', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.quantity}</span> },
    { key: 'unitPrice', header: 'Unit Price', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{fmt(Number(r.unitPrice))}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{fmt(Number(r.amount))}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(r) },
            { label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-4">
        {fetchError && <AlertBanner variant="error" message={fetchError} />}
        <ServerDataTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.lineId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No lines yet. Add one to build this order."
          headerRight={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} /> Add Line
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Line' : 'Add Line'}
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.description}>{editId ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="line-product" label="Product ID (optional)" value={form.productId}
            onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} />
          <Input id="line-description" label="Description" required value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="line-qty" label="Quantity" type="number" required value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="line-price" label="Unit Price" type="number" required value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} />
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Amount: <span className="tabular-nums text-text-primary">{fmt((Number(form.quantity) || 0) * (Number(form.unitPrice) || 0))}</span>
          </p>
        </div>
      </Modal>
    </>
  );
}
