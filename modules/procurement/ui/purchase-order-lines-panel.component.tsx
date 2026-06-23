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
import { faPlus, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Line = {
  lineId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
};

type LineForm = { productId: string; description: string; quantity: string; unitPrice: string };
const EMPTY_FORM: LineForm = { productId: '', description: '', quantity: '1', unitPrice: '0' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = { tenantId: string; purchaseOrderId: string; onRefresh: () => void };

export function PurchaseOrderLinesPanel({ tenantId, purchaseOrderId, onRefresh }: Props) {
  const [rows, setRows] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Line | null>(null);
  const [form, setForm] = useState<LineForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const basePath = `/tenant/${tenantId}/api/procurement/purchase-orders/${purchaseOrderId}/lines`;

  const fetchRows = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(basePath);
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load lines.'));
    } finally { setLoading(false); }
  }, [basePath]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }
  function openEdit(row: Line) {
    setEditing(row);
    setForm({
      productId: row.productId ?? '',
      description: row.description,
      quantity: String(row.quantity),
      unitPrice: String(row.unitPrice),
    });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      productId: form.productId || undefined,
      description: form.description,
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
    };
    try {
      if (editing) {
        await api.patch(`${basePath}/${editing.lineId}`, payload);
        toast.success('Line updated');
      } else {
        await api.post(basePath, payload);
        toast.success('Line added');
      }
      setModalOpen(false);
      await fetchRows();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save line.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(row: Line) {
    if (!window.confirm(`Remove line "${row.description}"?`)) return;
    try {
      await api.delete(`${basePath}/${row.lineId}`);
      toast.success('Line removed');
      await fetchRows();
      onRefresh();
    } catch (err) { toast.error(extractMessage(err, 'Failed to remove line.')); }
  }

  const columns: TableColumn<Line>[] = [
    { key: 'description', header: 'Description', render: (r) => <span className="font-medium text-text-primary">{r.description}</span> },
    { key: 'quantity', header: 'Quantity', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.quantity}</span> },
    { key: 'unitPrice', header: 'Unit Price', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{Number(r.unitPrice).toFixed(2)}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{(Number(r.quantity) * Number(r.unitPrice)).toFixed(2)}</span> },
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
    <>
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
        emptyMessage="No lines yet. Add one to build this purchase order."
        headerRight={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} /> Add Line
          </Button>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Line' : 'Add Line'}
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="line-product" label="Product (optional)" value={form.productId}
            onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} />
          <Input id="line-desc" label="Description" required value={form.description}
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
        </div>
      </Modal>
    </>
  );
}
