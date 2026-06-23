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

type ItemRow = {
  fulfillmentItemId: string;
  sku?: string | null;
  name: string;
  quantity: number;
  backorderedQuantity: number;
};

type ItemForm = { sku: string; name: string; quantity: string; backorderedQuantity: string };
const EMPTY: ItemForm = { sku: '', name: '', quantity: '1', backorderedQuantity: '0' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  fulfillmentId: string;
  onRefresh: () => void;
};

export function FulfillmentItemsPanel({ tenantId, fulfillmentId, onRefresh }: Props) {
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const base = `/tenant/${tenantId}/api/fulfillment/${fulfillmentId}/lines`;

  const fetchItems = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: 0, pageSize: 200 } });
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load items.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() { setEditId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(r: ItemRow) {
    setEditId(r.fulfillmentItemId);
    setForm({
      sku: r.sku ?? '',
      name: r.name,
      quantity: String(r.quantity),
      backorderedQuantity: String(r.backorderedQuantity ?? 0),
    });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      sku: form.sku || undefined,
      name: form.name,
      quantity: Number(form.quantity) || 1,
      backorderedQuantity: Number(form.backorderedQuantity) || 0,
    };
    try {
      if (editId) {
        await api.patch(`${base}/${editId}`, payload);
        toast.success('Item updated');
      } else {
        await api.post(base, payload);
        toast.success('Item added');
      }
      setModalOpen(false);
      await fetchItems();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save item.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: ItemRow) {
    if (!confirm(`Remove item "${r.name}"?`)) return;
    try {
      await api.delete(`${base}/${r.fulfillmentItemId}`);
      toast.success('Item removed');
      await fetchItems();
      onRefresh();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to remove item.'));
    }
  }

  const columns: TableColumn<ItemRow>[] = [
    { key: 'name', header: 'Item', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { key: 'sku', header: 'SKU', render: (r) => <span className="text-text-secondary">{r.sku ?? '—'}</span> },
    { key: 'quantity', header: 'Qty', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{r.quantity}</span> },
    { key: 'backorderedQuantity', header: 'Backordered', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.backorderedQuantity ?? 0}</span> },
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
          getRowKey={(r) => r.fulfillmentItemId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No items yet. Add one to build this shipment."
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
          <Input id="item-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="item-sku" label="SKU (optional)" value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="item-qty" label="Quantity" type="number" required value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="item-backorder" label="Backordered" type="number" value={form.backorderedQuantity}
                onChange={(e) => setForm((f) => ({ ...f, backorderedQuantity: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
