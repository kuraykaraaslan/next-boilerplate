'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@nb/common/server/axios';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { Breadcrumb } from '@nb/common/ui/Breadcrumb';
import { Button } from '@nb/common/ui/Button';
import { Input } from '@nb/common/ui/Input';
import { Select } from '@nb/common/ui/Select';
import { Card } from '@nb/common/ui/Card';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { TabGroup } from '@nb/common/ui/TabGroup';
import { Spinner } from '@nb/common/ui/Spinner';
import { toast } from '@nb/common/ui/toast.store';
import { ProductStatusBadge } from '@nb/store/ui/ProductStatusBadge';
import { ProductVariantsPanel } from '@nb/store/ui/ProductVariantsPanel';
import { ProductImagesPanel } from '@nb/store/ui/ProductImagesPanel';
import { SeoPanel } from '@nb/seo/ui';
import { GalleryPanel } from '@nb/media_gallery/ui/GalleryPanel';
import { CurrencySelector } from '@nb/common/ui/CurrencySelector';
import dynamic from 'next/dynamic';
import { ProductSpecValuesPanel } from '@nb/store/ui/ProductSpecValuesPanel';

// Quill + its CSS (~150KB) only load when the product editor actually mounts,
// keeping the rest of the admin product page light.
const RichTextEditor = dynamic(
  () => import('@nb/common/ui/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-44 rounded-md border border-border bg-surface-sunken animate-pulse" /> },
);
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCopy } from '@fortawesome/free-solid-svg-icons';
import {
  type Product, type VariantGroupItemRow, type VariantProductInfo, type EditForm,
  statusOptions, extractMessage,
} from './product-edit.utils';
import type { ProductStatus } from '@nb/store/ui/ProductStatusBadge';

export default function ProductDetailPage({ params }: { params: Promise<{ tenantId: string; productId: string }> }) {
  const { tenantId, productId } = use(params);
  const router = useRouter();

  const [product, setProduct]           = useState<Product | null>(null);
  const [variantItems, setVariantItems] = useState<VariantGroupItemRow[]>([]);
  const [variantProducts, setVariantProducts] = useState<Record<string, VariantProductInfo>>({});
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [duplicating, setDuplicating]   = useState(false);

  const [form, setForm] = useState<EditForm>({
    name: '', slug: '', shortDescription: '', details: '',
    basePrice: '0', currency: 'USD',
    sku: '', stockQuantity: '', trackInventory: true,
    status: 'DRAFT', isFeatured: false, tags: '',
  });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [prodRes, groupRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/store/products/${productId}?detail=true`),
        api.get(`/tenant/${tenantId}/api/store/products/${productId}/variant-group`),
      ]);
      const p: Product = prodRes.data.product;
      setProduct(p);
      setVariantItems(groupRes.data.items ?? []);
      setVariantProducts(groupRes.data.products ?? {});
      setForm({
        name: p.name, slug: p.slug, shortDescription: p.shortDescription ?? '', details: p.details ?? '',
        basePrice: String(p.basePrice), currency: p.currency, sku: p.sku ?? '',
        stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : '',
        trackInventory: p.trackInventory, status: p.status, isFeatured: p.isFeatured,
        tags: (p.tags ?? []).join(', '),
      });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load product.'));
    } finally { setLoading(false); }
  }, [tenantId, productId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.put(`/tenant/${tenantId}/api/store/products/${productId}`, {
        name: form.name, slug: form.slug,
        shortDescription: form.shortDescription || undefined,
        details: form.details || undefined,
        basePrice: Number(form.basePrice), currency: form.currency,
        sku: form.sku || undefined,
        stockQuantity: form.stockQuantity !== '' ? Number(form.stockQuantity) : undefined,
        trackInventory: form.trackInventory, status: form.status, isFeatured: form.isFeatured,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      });
      toast.success('Product saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function handleDuplicate(autoLink: boolean) {
    setDuplicating(true);
    try {
      const res = await api.post(`/tenant/${tenantId}/api/store/products/${productId}/duplicate`);
      const newProductId = res.data.product.productId as string;
      if (autoLink) {
        await api.post(`/tenant/${tenantId}/api/store/products/${productId}/variant-group/items`, {
          productId: newProductId,
        });
        toast.success('Duplicated and linked as variant');
        load();
        router.push(`/tenant/${tenantId}/admin/store/products/${newProductId}`);
      } else {
        toast.success('Product duplicated');
        router.push(`/tenant/${tenantId}/admin/store/products/${newProductId}`);
      }
    } catch (err) { toast.error(extractMessage(err, 'Failed to duplicate.')); }
    finally { setDuplicating(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!product) return null;

  const siblingItems = variantItems.filter((it) => it.productId !== productId);

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Basic Info</h3>
            <Input id="p-name" label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input id="p-slug" label="Slug" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            <Input id="p-short" label="Short Description" value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
            <Input id="p-tags" label="Tags (comma-separated)" value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
        </Card>
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Details</h3>
            <RichTextEditor id="p-details" value={form.details} onChange={(html) => setForm((f) => ({ ...f, details: html }))}
              minHeight={240} placeholder="Write a rich description for this product…" />
          </div>
        </Card>
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Pricing</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input id="p-price" label="Base Price" type="number" required value={form.basePrice}
                  onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
              </div>
              <div className="w-40">
                <CurrencySelector id="p-cur" label="Currency" value={form.currency} onChange={(cur) => setForm((f) => ({ ...f, currency: cur }))} />
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Inventory</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input id="p-sku" label="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </div>
              <div className="flex-1">
                <Input id="p-stock" label="Stock Quantity" type="number" value={form.stockQuantity}
                  onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm((f) => ({ ...f, trackInventory: e.target.checked }))} />
              Track inventory
            </label>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Status</h3>
            <Select id="p-status" label="Status" options={statusOptions} value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} />
              Featured product
            </label>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general',  label: 'General',                                   content: generalContent },
    { id: 'specs',    label: `Specs (${(product.specValues ?? []).length})`,
      content: <ProductSpecValuesPanel tenantId={tenantId} productId={productId} categoryId={product.categoryId} /> },
    { id: 'variants', label: `Variants (${siblingItems.length})`,
      content: (
        <ProductVariantsPanel
          tenantId={tenantId}
          productId={productId}
          variantItems={variantItems}
          variantProducts={variantProducts}
          duplicating={duplicating}
          onDuplicateAsVariant={() => handleDuplicate(true)}
          onRefresh={load}
        />
      ),
    },
    { id: 'images', label: `Images (${product.images.length})`,
      content: <ProductImagesPanel tenantId={tenantId} productId={productId} images={product.images} onRefresh={load} /> },
    { id: 'gallery', label: 'Gallery', content: <GalleryPanel tenantId={tenantId} entityType="store_product" entityId={productId} /> },
    { id: 'seo',     label: 'SEO',     content: <SeoPanel     tenantId={tenantId} entityType="store_product" entityId={productId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Products', href: `/tenant/${tenantId}/admin/store/products` },
        { label: product.name },
      ]} />

      <PageHeader
        title={product.name}
        subtitle={product.slug}
        badge={<ProductStatusBadge status={form.status as ProductStatus} />}
        actions={[
          { label: <><FontAwesomeIcon icon={faCopy} /> {duplicating ? 'Duplicating…' : 'Duplicate'}</>, onClick: () => handleDuplicate(false), disabled: duplicating },
          { label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving },
        ]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
