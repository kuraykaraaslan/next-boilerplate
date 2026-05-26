'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { Card } from '@/modules_next/common/ui/Card';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { BundleStatusBadge, type BundleStatus } from '@/modules_next/store/ui/ProductStatusBadge';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { SeoPanel } from '@/modules_next/seo/ui/SeoPanel';
import { GalleryPanel } from '@/modules_next/media_gallery/ui/GalleryPanel';
import { CurrencySelector } from '@/modules_next/common/ui/CurrencySelector';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

type BundleDetail = {
  bundleId: string;
  name: string;
  slug: string;
  description?: string | null;
  bundlePrice?: number | null;
  discountPercent?: number | null;
  currency: string;
  status: BundleStatus;
  sortOrder: number;
  items: Array<{
    bundleItemId: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    overridePrice?: number | null;
    sortOrder: number;
  }>;
};

type EditForm = { name: string; slug: string; description: string; bundlePrice: string; discountPercent: string; currency: string; status: string; sortOrder: string };
type AddItemForm = { productId: string; quantity: string; overridePrice: string };
type Product = { productId: string; name: string; basePrice: number; currency: string };

const EMPTY_ITEM: AddItemForm = { productId: '', quantity: '1', overridePrice: '' };
const statusOptions = [
  { value: 'DRAFT', label: 'Draft' }, { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' }, { value: 'SCHEDULED', label: 'Scheduled' },
];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function BundleDetailPage({ params }: { params: Promise<{ tenantId: string; bundleId: string }> }) {
  const { tenantId, bundleId } = use(params);

  const [bundle, setBundle]   = useState<BundleDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm]       = useState<EditForm>({ name: '', slug: '', description: '', bundlePrice: '', discountPercent: '', currency: 'USD', status: 'DRAFT', sortOrder: '0' });
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState<AddItemForm>(EMPTY_ITEM);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/bundles/${bundleId}?withItems=true`);
      const b: BundleDetail = res.data.bundle;
      setBundle(b);
      setForm({
        name: b.name, slug: b.slug, description: b.description ?? '',
        bundlePrice: b.bundlePrice != null ? String(b.bundlePrice) : '',
        discountPercent: b.discountPercent != null ? String(b.discountPercent) : '',
        currency: b.currency, status: b.status, sortOrder: String(b.sortOrder),
      });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load bundle.'));
    } finally { setLoading(false); }
  }, [tenantId, bundleId]);

  useEffect(() => {
    load();
    api.get(`/tenant/${tenantId}/api/store/products`, { params: { page: 0, pageSize: 200, status: 'ACTIVE' } })
      .then((r) => setProducts(r.data.data ?? []))
      .catch(() => {});
  }, [load, tenantId]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.put(`/tenant/${tenantId}/api/store/bundles/${bundleId}`, {
        name: form.name, slug: form.slug, description: form.description || undefined,
        bundlePrice: form.bundlePrice ? Number(form.bundlePrice) : undefined,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
        currency: form.currency, status: form.status, sortOrder: Number(form.sortOrder),
      });
      toast.success('Bundle saved'); load();
    } catch (err) { setSaveError(extractMessage(err, 'Failed to save.')); }
    finally { setSaving(false); }
  }

  async function handleAddItem() {
    setItemSaving(true); setItemError('');
    try {
      await api.post(`/tenant/${tenantId}/api/store/bundles/${bundleId}/items`, {
        productId: itemForm.productId,
        quantity: Number(itemForm.quantity),
        overridePrice: itemForm.overridePrice ? Number(itemForm.overridePrice) : undefined,
      });
      toast.success('Item added');
      setShowAddItem(false); setItemForm(EMPTY_ITEM); load();
    } catch (err) { setItemError(extractMessage(err, 'Failed to add item.')); }
    finally { setItemSaving(false); }
  }

  async function handleRemoveItem(itemId: string) {
    if (!confirm('Remove this item from the bundle?')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/bundles/${bundleId}/items/${itemId}`);
      toast.success('Item removed'); load();
    } catch (err) { toast.error(extractMessage(err, 'Failed to remove.')); }
  }

  function productName(productId: string) {
    return products.find((p) => p.productId === productId)?.name ?? productId.slice(0, 8);
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!bundle) return null;

  const itemColumns: TableColumn<BundleDetail['items'][0]>[] = [
    { key: 'product', header: 'Product', render: (i) => <span className="font-medium">{productName(i.productId)}</span> },
    { key: 'qty',  header: 'Quantity', render: (i) => <span className="tabular-nums">{i.quantity}</span> },
    {
      key: 'price', header: 'Override Price',
      render: (i) => i.overridePrice != null
        ? <span className="tabular-nums">{i.overridePrice} {bundle.currency}</span>
        : <span className="text-text-secondary text-xs">Default</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (i) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[{
            label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger',
            onClick: () => handleRemoveItem(i.bundleItemId),
          }]} />
        </div>
      ),
    },
  ];

  const productOptions = [
    { value: '', label: 'Select product…' },
    ...products.map((p) => ({ value: p.productId, label: p.name })),
  ];

  const generalContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">General</h3>
              <Input id="b-name" label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input id="b-slug" label="Slug" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              <Input id="b-desc" label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </Card>
          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Pricing</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input id="b-price" label="Bundle Price (empty = sum of items)" type="number" value={form.bundlePrice}
                    onChange={(e) => setForm((f) => ({ ...f, bundlePrice: e.target.value }))} />
                </div>
                <div className="flex-1">
                  <Input id="b-disc" label="Discount %" type="number" value={form.discountPercent}
                    onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))} />
                </div>
                <div className="w-36">
                  <CurrencySelector id="b-cur" label="Currency" value={form.currency} onChange={(cur) => setForm((f) => ({ ...f, currency: cur }))} />
                </div>
              </div>
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Status</h3>
              <Select id="b-status" label="Status" options={statusOptions} value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
              <Input id="b-order" label="Sort Order" type="number" value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Bundle Items ({bundle.items.length})</h2>
          <Button variant="secondary" size="sm" onClick={() => setShowAddItem(true)}>
            <FontAwesomeIcon icon={faPlus} /> Add Product
          </Button>
        </div>
        <ServerDataTable
          columns={itemColumns}
          rows={bundle.items}
          getRowKey={(i) => i.bundleItemId}
          page={1} totalPages={1} total={bundle.items.length} pageSize={bundle.items.length || 1}
          onPageChange={() => {}} loading={false}
          emptyMessage="No products in this bundle yet."
        />
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    { id: 'gallery', label: 'Gallery', content: <GalleryPanel tenantId={tenantId} entityType="store_bundle" entityId={bundleId} /> },
    { id: 'seo',     label: 'SEO',     content: <SeoPanel     tenantId={tenantId} entityType="store_bundle" entityId={bundleId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Bundles', href: `/tenant/${tenantId}/admin/store/bundles` },
        { label: bundle.name },
      ]} />

      <PageHeader
        title={bundle.name}
        subtitle={bundle.slug}
        badge={<BundleStatusBadge status={form.status as BundleStatus} />}
        actions={[{ label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving }]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />

      <Modal open={showAddItem} onClose={() => { setShowAddItem(false); setItemForm(EMPTY_ITEM); setItemError(''); }}
        title="Add Product to Bundle"
        footer={<>
          <Button variant="ghost" onClick={() => setShowAddItem(false)} disabled={itemSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleAddItem} loading={itemSaving}>Add</Button>
        </>}
      >
        <div className="space-y-4">
          {itemError && <AlertBanner variant="error" message={itemError} />}
          <Select id="item-prod" label="Product" required options={productOptions} value={itemForm.productId}
            onChange={(e) => setItemForm((f) => ({ ...f, productId: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="item-qty" label="Quantity" type="number" value={itemForm.quantity}
                onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="item-price" label="Override Price (optional)" type="number" value={itemForm.overridePrice}
                onChange={(e) => setItemForm((f) => ({ ...f, overridePrice: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
