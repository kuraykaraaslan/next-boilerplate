'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { Card } from '@/modules_next/common/ui/Card';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Badge } from '@/modules_next/common/ui/Badge';
import { TabGroup } from '@/modules_next/common/ui/TabGroup';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { toast } from '@/modules_next/common/ui/toast.store';
import { ProductStatusBadge, StockBadge, type ProductStatus } from '@/modules_next/store/ui/ProductStatusBadge';
import { SeoPanel } from '@/modules_next/seo/ui/SeoPanel';
import { GalleryPanel } from '@/modules_next/media_gallery/ui/GalleryPanel';
import { CurrencySelector } from '@/modules_next/common/ui/CurrencySelector';
import { RichTextEditor } from '@/modules_next/common/ui/RichTextEditor';
import { ProductSpecValuesPanel } from '@/modules_next/store/ui/ProductSpecValuesPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPlus, faTrash, faImage, faArrowUpRightFromSquare, faCopy, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

type Product = {
  productId: string;
  categoryId: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  details?: string | null;
  basePrice: number;
  currency: string;
  sku?: string | null;
  stockQuantity?: number | null;
  trackInventory: boolean;
  status: ProductStatus;
  isFeatured: boolean;
  tags?: string[] | null;
  images: Array<{ imageId: string; url: string; altText?: string | null; isPrimary: boolean; sortOrder: number }>;
  specValues?: Array<{ specValueId: string; specId: string; value: string }>;
};

type VariantGroupItemRow = {
  itemId: string;
  productId: string;
  label?: string | null;
  sortOrder: number;
};

type VariantProductInfo = {
  productId: string; name: string; basePrice: number; currency: string;
  status: string; sku?: string | null; stockQuantity?: number | null;
};

type SearchProduct = { productId: string; name: string; basePrice: number; currency: string; status: string };

type EditForm = {
  name: string; slug: string; shortDescription: string; details: string;
  basePrice: string; currency: string;
  sku: string; stockQuantity: string; trackInventory: boolean;
  status: string; isFeatured: boolean; tags: string;
};

type LinkForm = { variantProductId: string; label: string };
type EditLabelForm = { itemId: string; label: string };

type ImageForm = { url: string; altText: string; isPrimary: boolean };

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' }, { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' }, { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function formatPrice(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

export default function ProductDetailPage({ params }: { params: Promise<{ tenantId: string; productId: string }> }) {
  const { tenantId, productId } = use(params);
  const router = useRouter();

  const [product, setProduct]       = useState<Product | null>(null);
  const [variantItems, setVariantItems] = useState<VariantGroupItemRow[]>([]);
  const [variantProducts, setVariantProducts] = useState<Record<string, VariantProductInfo>>({});
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [duplicating, setDuplicating] = useState(false);

  const [form, setForm] = useState<EditForm>({
    name: '', slug: '', shortDescription: '', details: '',
    basePrice: '0', currency: 'USD',
    sku: '', stockQuantity: '', trackInventory: true,
    status: 'DRAFT', isFeatured: false, tags: '',
  });

  // Link variant modal
  const [showLink, setShowLink]       = useState(false);
  const [linkForm, setLinkForm]       = useState<LinkForm>({ variantProductId: '', label: '' });
  const [linkSearch, setLinkSearch]   = useState('');
  const [linkResults, setLinkResults] = useState<SearchProduct[]>([]);
  const [linkSaving, setLinkSaving]   = useState(false);
  const [linkError, setLinkError]     = useState('');

  // Edit label modal
  const [showEditLabel, setShowEditLabel] = useState(false);
  const [editLabelForm, setEditLabelForm] = useState<EditLabelForm>({ itemId: '', label: '' });
  const [editLabelSaving, setEditLabelSaving] = useState(false);

  // Image modal
  const [showImage, setShowImage]     = useState(false);
  const [imageForm, setImageForm]     = useState<ImageForm>({ url: '', altText: '', isPrimary: false });
  const [imageSaving, setImageSaving] = useState(false);

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
        basePrice: String(p.basePrice),
        currency: p.currency, sku: p.sku ?? '', stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : '',
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
        basePrice: Number(form.basePrice),
        currency: form.currency,
        sku: form.sku || undefined,
        stockQuantity: form.stockQuantity !== '' ? Number(form.stockQuantity) : undefined,
        trackInventory: form.trackInventory,
        status: form.status, isFeatured: form.isFeatured,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      });
      toast.success('Product saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

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
      load();
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
      toast.success(isSelf ? 'Left variant group' : 'Variant removed'); load();
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
      load();
    } catch (err) { toast.error(extractMessage(err, 'Failed to update label.')); }
    finally { setEditLabelSaving(false); }
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

  async function handleAddImage() {
    setImageSaving(true);
    try {
      await api.post(`/tenant/${tenantId}/api/store/products/${productId}/images`, {
        url: imageForm.url, altText: imageForm.altText || undefined, isPrimary: imageForm.isPrimary,
      });
      toast.success('Image added');
      setShowImage(false); setImageForm({ url: '', altText: '', isPrimary: false }); load();
    } catch (err) { toast.error(extractMessage(err, 'Failed to add image.')); }
    finally { setImageSaving(false); }
  }

  async function handleDeleteImage(imageId: string) {
    if (!confirm('Remove this image?')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/products/${productId}/images/${imageId}`);
      toast.success('Image removed'); load();
    } catch (err) { toast.error(extractMessage(err, 'Failed to remove.')); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!product) return null;

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
            <RichTextEditor
              id="p-details"
              value={form.details}
              onChange={(html) => setForm((f) => ({ ...f, details: html }))}
              minHeight={240}
              placeholder="Write a rich description for this product…"
            />
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

  const siblingItems = variantItems.filter((it) => it.productId !== productId);

  type VariantRow = VariantGroupItemRow & { isSelf: boolean; info: VariantProductInfo | null };
  const variantRows: VariantRow[] = variantItems.map((it) => ({
    ...it,
    isSelf: it.productId === productId,
    info: variantProducts[it.productId] ?? null,
  }));

  const variantColumns: TableColumn<VariantRow>[] = [
    {
      key: 'label', header: 'Label',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.label
            ? <span className="text-sm text-text-primary">{row.label}</span>
            : <span className="text-sm italic text-text-disabled">No label</span>}
          <button
            type="button"
            onClick={() => openEditLabel(row)}
            className="text-text-disabled hover:text-text-primary"
            aria-label="Edit label"
          >
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
    {
      key: 'stock', header: 'Stock',
      render: (row) => row.info ? <StockBadge qty={row.info.stockQuantity} /> : null,
    },
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
            {
              label: 'Edit label', icon: <FontAwesomeIcon icon={faPenToSquare} />,
              onClick: () => openEditLabel(row),
            },
            {
              label: row.isSelf ? 'Leave group' : 'Remove',
              icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger',
              onClick: () => handleRemoveItem(row.itemId),
            },
          ]} />
        </div>
      ),
    },
  ];

  const variantsContent = (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Products in this product&apos;s variant group. Visibility is symmetric — every member sees every other member. Edit any row&apos;s label, including this product&apos;s own.
      </p>
      <ServerDataTable
        columns={variantColumns}
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
            <Button variant="secondary" size="sm" onClick={() => handleDuplicate(true)} disabled={duplicating} loading={duplicating}>
              <FontAwesomeIcon icon={faCopy} /> Duplicate as Variant
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowLink(true)}>
              <FontAwesomeIcon icon={faPlus} /> Add Existing
            </Button>
          </div>
        }
      />
    </div>
  );

  const imagesContent = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setShowImage(true)}>
          <FontAwesomeIcon icon={faImage} /> Add Image
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {product.images.map((img) => (
          <div key={img.imageId} className="relative group rounded-lg overflow-hidden border border-border bg-surface-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.altText ?? ''} className="w-full aspect-square object-cover" />
            {img.isPrimary && <Badge className="absolute top-1 left-1" variant="success" size="sm">Primary</Badge>}
            <button
              className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-6 h-6 rounded bg-error text-white text-xs"
              onClick={() => handleDeleteImage(img.imageId)}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        ))}
        {product.images.length === 0 && <p className="col-span-full text-text-secondary text-sm">No images yet.</p>}
      </div>
    </div>
  );

  const tabs = [
    { id: 'general',  label: 'General',                              content: generalContent  },
    { id: 'specs',    label: `Specs (${(product.specValues ?? []).length})`,
      content: <ProductSpecValuesPanel tenantId={tenantId} productId={productId} categoryId={product.categoryId} /> },
    { id: 'variants', label: `Variants (${siblingItems.length})`,    content: variantsContent },
    { id: 'images',   label: `Images (${product.images.length})`,    content: imagesContent   },
    { id: 'gallery',  label: 'Gallery', content: <GalleryPanel tenantId={tenantId} entityType="store_product" entityId={productId} /> },
    { id: 'seo',      label: 'SEO',     content: <SeoPanel     tenantId={tenantId} entityType="store_product" entityId={productId} /> },
  ];

  const selectedLinkProduct = linkResults.find((p) => p.productId === linkForm.variantProductId);

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

      {/* Add to Variant Group Modal */}
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
            <Input
              id="link-search"
              label="Search product"
              value={linkSearch}
              onChange={(e) => handleSearchProducts(e.target.value)}
              placeholder="Type a product name…"
            />
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
            {selectedLinkProduct && (
              <p className="mt-1 text-xs text-success">Selected: {selectedLinkProduct.name}</p>
            )}
          </div>
          <Input
            id="link-label"
            label="Variant label (optional)"
            value={linkForm.label}
            onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
            hint='e.g. "Blue 256GB", "Large"'
          />
        </div>
      </Modal>

      {/* Edit Variant Label Modal */}
      <Modal
        open={showEditLabel}
        onClose={() => setShowEditLabel(false)}
        title="Edit Variant Label"
        footer={<>
          <Button variant="ghost" onClick={() => setShowEditLabel(false)} disabled={editLabelSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveLabel} loading={editLabelSaving}>Save</Button>
        </>}
      >
        <Input
          id="edit-label"
          label="Variant label"
          value={editLabelForm.label}
          onChange={(e) => setEditLabelForm((f) => ({ ...f, label: e.target.value }))}
          hint='Clear to remove. The label is shared across every product in this variant group.'
        />
      </Modal>

      {/* Add Image Modal */}
      <Modal open={showImage} onClose={() => setShowImage(false)} title="Add Image"
        footer={<>
          <Button variant="ghost" onClick={() => setShowImage(false)} disabled={imageSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleAddImage} loading={imageSaving}>Add</Button>
        </>}
      >
        <div className="space-y-4">
          <Input id="img-url" label="Image URL" required value={imageForm.url}
            onChange={(e) => setImageForm((f) => ({ ...f, url: e.target.value }))} />
          <Input id="img-alt" label="Alt Text" value={imageForm.altText}
            onChange={(e) => setImageForm((f) => ({ ...f, altText: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={imageForm.isPrimary} onChange={(e) => setImageForm((f) => ({ ...f, isPrimary: e.target.checked }))} />
            Set as primary image
          </label>
        </div>
      </Modal>
    </div>
  );
}
