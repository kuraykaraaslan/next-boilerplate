'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

type ReturnLineRow = {
  returnItemId: string;
  productId?: string | null;
  sku?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  condition?: string | null;
};

type LineForm = { name: string; sku: string; quantity: string; unitPrice: string; condition: string };
const EMPTY: LineForm = { name: '', sku: '', quantity: '1', unitPrice: '0', condition: '' };
const CONDITION_OPTIONS = [
  { value: '', label: '—' },
  ...['UNOPENED', 'USED', 'DAMAGED', 'DEFECTIVE', 'OTHER'].map((v) => ({ value: v, label: v })),
];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  returnId: string;
  currency?: string | null;
  onRefresh: () => void;
};

export function ReturnLinesPanel({ tenantId, returnId, currency, onRefresh }: Props) {
  const [rows, setRows] = useState<ReturnLineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<LineForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const base = `/tenant/${tenantId}/api/returns/${returnId}/lines`;

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
  function openEdit(r: ReturnLineRow) {
    setEditId(r.returnItemId);
    setForm({
      name: r.name,
      sku: r.sku ?? '',
      quantity: String(r.quantity),
      unitPrice: String(r.unitPrice),
      condition: r.condition ?? '',
    });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      name: form.name,
      sku: form.sku || undefined,
      quantity: Number(form.quantity) || 1,
      unitPrice: Number(form.unitPrice) || 0,
      condition: form.condition || undefined,
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

  async function handleDelete(r: ReturnLineRow) {
    if (!confirm(`Remove line "${r.name}"?`)) return;
    try {
      await api.delete(`${base}/${r.returnItemId}`);
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

  const columns: TableColumn<ReturnLineRow>[] = [
    { key: 'name', header: 'Item', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { key: 'sku', header: 'SKU', render: (r) => <span className="text-text-secondary">{r.sku ?? '—'}</span> },
    { key: 'quantity', header: 'Qty', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.quantity}</span> },
    { key: 'unitPrice', header: 'Unit Price', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{fmt(Number(r.unitPrice))}</span> },
    { key: 'amount', header: 'Refund', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{fmt(Number(r.amount))}</span> },
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
          getRowKey={(r) => r.returnItemId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No items yet. Add the products being returned."
          headerRight={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} /> Add Item
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Item' : 'Add Item'}
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.name}>{editId ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="rline-name" label="Item name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="rline-sku" label="SKU (optional)" value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="rline-qty" label="Quantity" type="number" required value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="rline-price" label="Unit Price" type="number" required value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} />
            </div>
          </div>
          <Select id="rline-condition" label="Condition" options={CONDITION_OPTIONS}
            value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))} />
          <p className="text-sm text-text-secondary">
            Refund: <span className="tabular-nums text-text-primary">{fmt((Number(form.quantity) || 0) * (Number(form.unitPrice) || 0))}</span>
          </p>
        </div>
      </Modal>
    </>
  );
}
