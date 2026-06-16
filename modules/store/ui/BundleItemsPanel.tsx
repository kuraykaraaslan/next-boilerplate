'use client';

import { useState } from 'react';
import api from '@nb/common/server/axios';
import { Button } from '@nb/common/ui/Button';
import { Input } from '@nb/common/ui/Input';
import { Select } from '@nb/common/ui/Select';
import { Modal } from '@nb/common/ui/Modal';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/ServerDataTable';
import { RowActionsMenu } from '@nb/common/ui/RowActionsMenu';
import { toast } from '@nb/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPen } from '@fortawesome/free-solid-svg-icons';

type BundleItem = {
  bundleItemId: string;
  productId: string;
  productName?: string | null;
  productBasePrice?: number | null;
  productCurrency?: string | null;
  variantId?: string | null;
  quantity: number;
  overridePrice?: number | null;
  sortOrder: number;
};

type Product = { productId: string; name: string; basePrice: number; currency: string };
type AddItemForm = { productId: string; quantity: string; overridePrice: string };
type EditItemForm = { quantity: string; overridePrice: string };
const EMPTY_ITEM: AddItemForm = { productId: '', quantity: '1', overridePrice: '' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

interface Props {
  tenantId: string;
  bundleId: string;
  bundleCurrency: string;
  items: BundleItem[];
  products: Product[];
  onRefresh: () => void;
}

export function BundleItemsPanel({ tenantId, bundleId, bundleCurrency, items, products, onRefresh }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddItemForm>(EMPTY_ITEM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState('');

  const [editItem, setEditItem] = useState<BundleItem | null>(null);
  const [editForm, setEditForm] = useState<EditItemForm>({ quantity: '1', overridePrice: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState('');

  function productName(item: BundleItem) {
    return item.productName ?? products.find((p) => p.productId === item.productId)?.name ?? item.productId.slice(0, 8);
  }

  async function handleAdd() {
    setAddSaving(true); setAddError('');
    try {
      await api.post(`/tenant/${tenantId}/api/store/bundles/${bundleId}/items`, {
        productId: addForm.productId,
        quantity: Number(addForm.quantity),
        overridePrice: addForm.overridePrice ? Number(addForm.overridePrice) : undefined,
      });
      toast.success('Item added');
      setShowAdd(false); setAddForm(EMPTY_ITEM); onRefresh();
    } catch (err) { setAddError(extractMessage(err, 'Failed to add item.')); }
    finally { setAddSaving(false); }
  }

  async function handleUpdate() {
    if (!editItem) return;
    setEditSaving(true); setEditError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/store/bundles/${bundleId}/items/${editItem.bundleItemId}`, {
        quantity: Number(editForm.quantity),
        overridePrice: editForm.overridePrice === '' ? null : Number(editForm.overridePrice),
      });
      toast.success('Item updated');
      setEditItem(null); onRefresh();
    } catch (err) { setEditError(extractMessage(err, 'Failed to update item.')); }
    finally { setEditSaving(false); }
  }

  async function handleRemove(item: BundleItem) {
    if (!confirm('Remove this item from the bundle?')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/bundles/${bundleId}/items/${item.bundleItemId}`);
      toast.success('Item removed'); onRefresh();
    } catch (err) { toast.error(extractMessage(err, 'Failed to remove.')); }
  }

  const columns: TableColumn<BundleItem>[] = [
    { key: 'product', header: 'Product', render: (i) => <span className="font-medium">{productName(i)}</span> },
    { key: 'qty', header: 'Quantity', render: (i) => <span className="tabular-nums">{i.quantity}</span> },
    {
      key: 'price', header: 'Override Price',
      render: (i) => i.overridePrice != null
        ? <span className="tabular-nums">{i.overridePrice} {bundleCurrency}</span>
        : <span className="text-text-secondary text-xs">Default{i.productBasePrice != null ? ` (${i.productBasePrice} ${i.productCurrency ?? bundleCurrency})` : ''}</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (i) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPen} />, onClick: () => { setEditItem(i); setEditForm({ quantity: String(i.quantity), overridePrice: i.overridePrice != null ? String(i.overridePrice) : '' }); setEditError(''); } },
            { label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleRemove(i) },
          ]} />
        </div>
      ),
    },
  ];

  const productOptions = [
    { value: '', label: 'Select product…' },
    ...products.map((p) => ({ value: p.productId, label: p.name })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Bundle Items ({items.length})</h2>
        <Button variant="secondary" size="sm" onClick={() => { setShowAdd(true); setAddForm(EMPTY_ITEM); setAddError(''); }}>
          <FontAwesomeIcon icon={faPlus} /> Add Product
        </Button>
      </div>
      <ServerDataTable
        columns={columns} rows={items} getRowKey={(i) => i.bundleItemId}
        page={1} totalPages={1} total={items.length} pageSize={items.length || 1}
        onPageChange={() => {}} loading={false} emptyMessage="No products in this bundle yet."
      />

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddForm(EMPTY_ITEM); setAddError(''); }}
        title="Add Product to Bundle"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)} disabled={addSaving}>Cancel</Button><Button variant="primary" onClick={handleAdd} loading={addSaving}>Add</Button></>}
      >
        <div className="space-y-4">
          {addError && <AlertBanner variant="error" message={addError} />}
          <Select id="item-prod" label="Product" required options={productOptions} value={addForm.productId}
            onChange={(e) => setAddForm((f) => ({ ...f, productId: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="item-qty" label="Quantity" type="number" value={addForm.quantity}
                onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="item-price" label="Override Price (optional)" type="number" value={addForm.overridePrice}
                onChange={(e) => setAddForm((f) => ({ ...f, overridePrice: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)}
        title={editItem ? `Edit ${productName(editItem)}` : 'Edit Item'}
        footer={<><Button variant="ghost" onClick={() => setEditItem(null)} disabled={editSaving}>Cancel</Button><Button variant="primary" onClick={handleUpdate} loading={editSaving}>Save</Button></>}
      >
        <div className="space-y-4">
          {editError && <AlertBanner variant="error" message={editError} />}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="edit-qty" label="Quantity" type="number" value={editForm.quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="edit-price" label="Override Price (empty = default)" type="number" value={editForm.overridePrice}
                onChange={(e) => setEditForm((f) => ({ ...f, overridePrice: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
