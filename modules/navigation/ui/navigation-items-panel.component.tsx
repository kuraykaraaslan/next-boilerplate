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
  itemId: string;
  label: string;
  url: string;
  order: number;
  parentId?: string | null;
};

type ItemForm = { label: string; url: string; order: string; parentId: string };
const EMPTY: ItemForm = { label: '', url: '', order: '0', parentId: '' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  menuId: string;
  onRefresh: () => void;
};

export function NavigationItemsPanel({ tenantId, menuId, onRefresh }: Props) {
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const base = `/tenant/${tenantId}/api/navigation/menus/${menuId}/lines`;

  const fetchItems = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base);
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load items.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openCreate() { setEditId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(r: ItemRow) {
    setEditId(r.itemId);
    setForm({
      label: r.label,
      url: r.url,
      order: String(r.order ?? 0),
      parentId: r.parentId ?? '',
    });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      label: form.label,
      url: form.url,
      order: Number(form.order) || 0,
      parentId: form.parentId || null,
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
    if (!confirm(`Remove item "${r.label}"?`)) return;
    try {
      await api.delete(`${base}/${r.itemId}`);
      toast.success('Item removed');
      await fetchItems();
      onRefresh();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to remove item.'));
    }
  }

  const columns: TableColumn<ItemRow>[] = [
    { key: 'label', header: 'Label', render: (r) => <span className="font-medium text-text-primary">{r.label}</span> },
    { key: 'url', header: 'URL', render: (r) => <span className="text-text-secondary">{r.url}</span> },
    { key: 'order', header: 'Order', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.order}</span> },
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
          getRowKey={(r) => r.itemId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No items yet. Add one to build this menu."
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
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.label || !form.url}>{editId ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="item-label" label="Label" required value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          <Input id="item-url" label="URL" required value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            hint="e.g. /about or https://example.com" />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="item-order" label="Order" type="number" value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="item-parent" label="Parent Item ID (optional)" value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
