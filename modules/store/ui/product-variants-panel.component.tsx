'use client';

import { useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { StockBadge } from './product-status-badge.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faCopy, faPenToSquare, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

type VariantGroupItemRow = { itemId: string; productId: string; label?: string | null; sortOrder: number };
type VariantProductInfo = {
  productId: string; name: string; basePrice: number; currency: string;
  status: string; sku?: string | null; stockQuantity?: number | null;
};
type SearchProduct = { productId: string; name: string; basePrice: number; currency: string; status: string };

function formatPrice(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  productId: string;
  variantItems: VariantGroupItemRow[];
  variantProducts: Record<string, VariantProductInfo>;
  duplicating: boolean;
  onDuplicateAsVariant: () => void;
  onRefresh: () => void;
};

export function ProductVariantsPanel({
  tenantId, productId, variantItems, variantProducts, duplicating, onDuplicateAsVariant, onRefresh,
}: Props) {
  const [showLink, setShowLink] = useState(false);
  const [linkForm, setLinkForm] = useState({ variantProductId: '', label: '' });
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState<SearchProduct[]>([]);
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [showEditLabel, setShowEditLabel] = useState(false);
  const [editLabelForm, setEditLabelForm] = useState({ itemId: '', label: '' });
  const [editLabelSaving, setEditLabelSaving] = useState(false);

  async function handleSearchProducts(q: string) {
    setLinkSearch(q);
    if (!q.trim()) { setLinkResults([]); return; }
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/products`, { params: { search: q, pageSize: 8 } });
      setLinkResults((res.data.data ?? []).filter((p: SearchProduct) => p.productId !== productId));
    } catch { setLinkResults([]); }
  }

  async function handleAddLink() {
    if (!linkForm.variantProductId) { setLinkError('Please select a product.'); return; }
    setLinkSaving(true); setLinkError('');
    try {
      await api.post(`/tenant/${tenantId}/api/store/products/${productId}/variant-group/items`, {
        productId: linkForm.variantProductId,
        label: linkForm.label || undefined,
      });
      toast.success('Variant added');
      setShowLink(false); setLinkForm({ variantProductId: '', label: '' }); setLinkSearch(''); setLinkResults([]);
      onRefresh();
    } catch (err) { setLinkError(extractMessage(err, 'Failed to add variant.')); }
    finally { setLinkSaving(false); }
  }

  async function handleRemoveItem(itemId: string) {
    const isSelf = variantItems.find((it) => it.itemId === itemId)?.productId === productId;
    const msg = isSelf
      ? 'Leave this variant group? Other members will no longer see this product as a variant.'
      : 'Remove this variant from the group?';
    if (!confirm(msg)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/products/${productId}/variant-group/items/${itemId}`);
      toast.success(isSelf ? 'Left variant group' : 'Variant removed');
      onRefresh();
    } catch (err) { toast.error(extractMessage(err, 'Failed to remove.')); }
  }

  function openEditLabel(item: VariantGroupItemRow) {
    setEditLabelForm({ itemId: item.itemId, label: item.label ?? '' });
    setShowEditLabel(true);
  }

  async function handleSaveLabel() {
    setEditLabelSaving(true);
    try {
      await api.patch(`/tenant/${tenantId}/api/store/products/${productId}/variant-group/items/${editLabelForm.itemId}`, {
        label: editLabelForm.label || null,
      });
      toast.success('Label updated');
      setShowEditLabel(false);
      onRefresh();
    } catch (err) { toast.error(extractMessage(err, 'Failed to update label.')); }
    finally { setEditLabelSaving(false); }
  }

  type VariantRow = VariantGroupItemRow & { isSelf: boolean; info: VariantProductInfo | null };
  const variantRows: VariantRow[] = variantItems.map((it) => ({
    ...it, isSelf: it.productId === productId, info: variantProducts[it.productId] ?? null,
  }));

  const columns: TableColumn<VariantRow>[] = [
    {
      key: 'label', header: 'Label',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.label
            ? <span className="text-sm text-text-primary">{row.label}</span>
            : <span className="text-sm italic text-text-disabled">No label</span>}
          <button type="button" onClick={() => openEditLabel(row)} className="text-text-disabled hover:text-text-primary" aria-label="Edit label">
            <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3" />
          </button>
        </div>
      ),
    },
    {
      key: 'product', header: 'Product',
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-text-primary truncate">
              {row.info?.name ?? <span className="text-text-disabled italic">Not found</span>}
            </p>
            {row.isSelf && <Badge size="sm" variant="info">Current</Badge>}
          </div>
          {row.info?.sku && <code className="text-xs text-text-secondary">{row.info.sku}</code>}
        </div>
      ),
    },
    {
      key: 'price', header: 'Price',
      render: (row) => row.info
        ? <span className="tabular-nums text-text-primary">{formatPrice(row.info.basePrice, row.info.currency)}</span>
        : <span className="text-text-disabled">—</span>,
    },
    { key: 'stock', header: 'Stock', render: (row) => row.info ? <StockBadge qty={row.info.stockQuantity} /> : null },
    {
      key: '_actions', header: '', align: 'right',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end items-center gap-1">
          {row.info && !row.isSelf && (
            <Button variant="ghost" size="sm" onClick={() => window.open(`/tenant/${tenantId}/admin/store/products/${row.info!.productId}`, '_blank')}>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </Button>
          )}
          <RowActionsMenu actions={[
            { label: 'Edit label', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEditLabel(row) },
            { label: row.isSelf ? 'Leave group' : 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleRemoveItem(row.itemId) },
          ]} />
        </div>
      ),
    },
  ];

  const selectedLinkProduct = linkResults.find((p) => p.productId === linkForm.variantProductId);

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Products in this product&apos;s variant group. Visibility is symmetric — every member sees every other member.
        </p>
        <ServerDataTable
          columns={columns}
          rows={variantRows}
          getRowKey={(r) => r.itemId}
          page={1}
          totalPages={1}
          total={variantRows.length}
          onPageChange={() => {}}
          hidePagination
          emptyMessage="No variants yet. Duplicate this product to spawn a new variant, or link an existing product."
          headerRight={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onDuplicateAsVariant} disabled={duplicating} loading={duplicating}>
                <FontAwesomeIcon icon={faCopy} /> Duplicate as Variant
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowLink(true)}>
                <FontAwesomeIcon icon={faPlus} /> Add Existing
              </Button>
            </div>
          }
        />
      </div>

      <Modal
        open={showLink}
        onClose={() => { setShowLink(false); setLinkForm({ variantProductId: '', label: '' }); setLinkSearch(''); setLinkResults([]); setLinkError(''); }}
        title="Add Product to Variant Group"
        footer={<>
          <Button variant="ghost" onClick={() => setShowLink(false)} disabled={linkSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleAddLink} loading={linkSaving} disabled={!linkForm.variantProductId}>Add</Button>
        </>}
      >
        <div className="space-y-4">
          {linkError && <AlertBanner variant="error" message={linkError} />}
          <div>
            <Input id="link-search" label="Search product" value={linkSearch}
              onChange={(e) => handleSearchProducts(e.target.value)} placeholder="Type a product name…" />
            {linkResults.length > 0 && (
              <div className="mt-1 border border-border rounded-lg overflow-hidden">
                {linkResults.map((p) => (
                  <button
                    key={p.productId}
                    type="button"
                    onClick={() => { setLinkForm((f) => ({ ...f, variantProductId: p.productId })); setLinkSearch(p.name); setLinkResults([]); }}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-surface-overlay transition-colors border-b border-border last:border-0"
                  >
                    <span className="font-medium text-text-primary">{p.name}</span>
                    <span className="text-text-secondary tabular-nums">{formatPrice(p.basePrice, p.currency)}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedLinkProduct && <p className="mt-1 text-xs text-success">Selected: {selectedLinkProduct.name}</p>}
          </div>
          <Input id="link-label" label="Variant label (optional)" value={linkForm.label}
            onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
            hint={'e.g. "Blue 256GB", "Large"'} />
        </div>
      </Modal>

      <Modal
        open={showEditLabel}
        onClose={() => setShowEditLabel(false)}
        title="Edit Variant Label"
        footer={<>
          <Button variant="ghost" onClick={() => setShowEditLabel(false)} disabled={editLabelSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveLabel} loading={editLabelSaving}>Save</Button>
        </>}
      >
        <Input id="edit-label" label="Variant label" value={editLabelForm.label}
          onChange={(e) => setEditLabelForm((f) => ({ ...f, label: e.target.value }))}
          hint={'Clear to remove. The label is shared across every product in this variant group.'} />
      </Modal>
    </>
  );
}
