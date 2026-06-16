'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { Breadcrumb } from '@nb/common/ui/breadcrumb.component';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Select } from '@nb/common/ui/select.component';
import { Card } from '@nb/common/ui/card.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { Spinner } from '@nb/common/ui/spinner.component';
import { toast } from '@nb/common/ui/toast.store';
import { BundleStatusBadge, type BundleStatus } from '@nb/store/ui/product-status-badge.component';
import { TabGroup } from '@nb/common/ui/tab-group.component';
import { SeoPanel } from '@nb/seo/ui';
import { GalleryPanel } from '@nb/media_gallery/ui/gallery-panel.component';
import { CurrencySelector } from '@nb/common/ui/currency-selector.component';
import { BundleItemsPanel } from '@nb/store/ui/bundle-items-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';

type BundleDetail = {
  bundleId: string; name: string; slug: string; description?: string | null;
  bundlePrice?: number | null; discountPercent?: number | null; currency: string;
  status: BundleStatus; sortOrder: number;
  items: Array<{
    bundleItemId: string; productId: string; productName?: string | null;
    productBasePrice?: number | null; productCurrency?: string | null;
    variantId?: string | null; quantity: number; overridePrice?: number | null; sortOrder: number;
  }>;
};
type Product = { productId: string; name: string; basePrice: number; currency: string };
type EditForm = { name: string; slug: string; description: string; bundlePrice: string; discountPercent: string; currency: string; status: string; sortOrder: string };

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

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/bundles/${bundleId}?withItems=true`);
      const b: BundleDetail = res.data.bundle;
      setBundle(b);
      setForm({ name: b.name, slug: b.slug, description: b.description ?? '', bundlePrice: b.bundlePrice != null ? String(b.bundlePrice) : '', discountPercent: b.discountPercent != null ? String(b.discountPercent) : '', currency: b.currency, status: b.status, sortOrder: String(b.sortOrder) });
    } catch (err) { setLoadError(extractMessage(err, 'Failed to load bundle.')); }
    finally { setLoading(false); }
  }, [tenantId, bundleId]);

  useEffect(() => {
    load();
    api.get(`/tenant/${tenantId}/api/store/products`, { params: { page: 0, pageSize: 200, status: 'ACTIVE' } })
      .then((r) => setProducts(r.data.data ?? [])).catch(() => {});
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

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!bundle) return null;

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
                  <Input id="b-price" label="Bundle Price (empty = sum of items)" type="number" value={form.bundlePrice} onChange={(e) => setForm((f) => ({ ...f, bundlePrice: e.target.value }))} />
                </div>
                <div className="flex-1">
                  <Input id="b-disc" label="Discount %" type="number" value={form.discountPercent} onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))} />
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
              <Select id="b-status" label="Status" options={statusOptions} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
              <Input id="b-order" label="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </div>
          </Card>
        </div>
      </div>
      <BundleItemsPanel
        tenantId={tenantId} bundleId={bundleId} bundleCurrency={bundle.currency}
        items={bundle.items} products={products} onRefresh={load}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Bundles', href: `/tenant/${tenantId}/admin/store/bundles` }, { label: bundle.name }]} />
      <PageHeader
        title={bundle.name} subtitle={bundle.slug}
        badge={<BundleStatusBadge status={form.status as BundleStatus} />}
        actions={[{ label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving }]}
      />
      {saveError && <AlertBanner variant="error" message={saveError} />}
      <TabGroup tabs={[
        { id: 'general', label: 'General', content: generalContent },
        { id: 'gallery', label: 'Gallery', content: <GalleryPanel tenantId={tenantId} entityType="store_bundle" entityId={bundleId} /> },
        { id: 'seo',     label: 'SEO',     content: <SeoPanel     tenantId={tenantId} entityType="store_bundle" entityId={bundleId} /> },
      ]} />
    </div>
  );
}
