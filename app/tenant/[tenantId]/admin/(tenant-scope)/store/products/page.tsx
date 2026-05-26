'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/modules_next/common/axios';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { ProductStatusBadge, StockBadge, type ProductStatus } from '@/modules_next/store/ui/ProductStatusBadge';
import { CurrencySelector } from '@/modules_next/common/ui/CurrencySelector';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash, faCopy } from '@fortawesome/free-solid-svg-icons';

type Product = {
  productId: string;
  name: string;
  slug: string;
  basePrice: number;
  currency: string;
  status: ProductStatus;
  stockQuantity?: number | null;
  isFeatured: boolean;
  categoryId: string;
  createdAt: string;
};

type Category = { categoryId: string; name: string };
type CreateForm = { name: string; slug: string; categoryId: string; basePrice: string; currency: string };
const EMPTY_FORM: CreateForm = { name: '', slug: '', categoryId: '', basePrice: '0', currency: 'USD' };
const PAGE_SIZE = 20;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function formatPrice(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}
function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function StoreProductsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]     = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchProducts = useCallback(async (p: number, q: string, st: string, cat: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/products`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined, status: st || undefined, categoryId: cat || undefined },
      });
      setProducts(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load products.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/store/categories`, { params: { page: 0, pageSize: 200 } })
      .then((r) => setCategories(r.data.data ?? []))
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => { setPage(1); fetchProducts(1, search, status, catFilter); }, [status, catFilter]);
  useEffect(() => { fetchProducts(page, search, status, catFilter); }, [page]);

  function handleSearch(v: string) { setSearch(v); setPage(1); fetchProducts(1, v, status, catFilter); }

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      const res = await api.post(`/tenant/${tenantId}/api/store/products`, {
        name: form.name,
        slug: form.slug || slugify(form.name),
        categoryId: form.categoryId,
        basePrice: Number(form.basePrice),
        currency: form.currency,
        status: 'DRAFT',
      });
      toast.success('Product created');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      router.push(`/tenant/${tenantId}/admin/store/products/${res.data.product.productId}`);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create product.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(productId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/products/${productId}`);
      toast.success('Product deleted');
      fetchProducts(page, search, status, catFilter);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete.'));
    }
  }

  async function handleDuplicate(productId: string) {
    try {
      const res = await api.post(`/tenant/${tenantId}/api/store/products/${productId}/duplicate`);
      toast.success('Product duplicated');
      router.push(`/tenant/${tenantId}/admin/store/products/${res.data.product.productId}`);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to duplicate.'));
    }
  }

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ARCHIVED', label: 'Archived' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  ];
  const catOptions = [
    { value: '', label: 'All categories' },
    ...categories.map((c) => ({ value: c.categoryId, label: c.name })),
  ];

  const columns: TableColumn<Product>[] = [
    {
      key: 'name', header: 'Product',
      render: (p) => (
        <div>
          <p className="font-medium text-text-primary">{p.name}</p>
          <p className="text-xs text-text-secondary">{p.slug}</p>
        </div>
      ),
    },
    {
      key: 'price', header: 'Price',
      render: (p) => <span className="tabular-nums font-semibold text-text-primary">{formatPrice(p.basePrice, p.currency)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (p) => <ProductStatusBadge status={p.status} size="sm" dot />,
    },
    {
      key: 'stock', header: 'Stock',
      render: (p) => <StockBadge qty={p.stockQuantity} />,
    },
    {
      key: 'createdAt', header: 'Created',
      render: (p) => <span className="text-text-secondary">{new Date(p.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            {
              label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />,
              onClick: () => router.push(`/tenant/${tenantId}/admin/store/products/${p.productId}`),
            },
            {
              label: 'Duplicate', icon: <FontAwesomeIcon icon={faCopy} />,
              onClick: () => handleDuplicate(p.productId),
            },
            {
              label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger',
              onClick: () => handleDelete(p.productId, p.name),
            },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle={loading ? '…' : `${total} product${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Product</>, onClick: () => setShowCreate(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={products}
        getRowKey={(p) => p.productId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/tenant/${tenantId}/admin/store/products/${p.productId}`)}
        loading={loading}
        emptyMessage="No products yet."
        toolbar={
          <div className="flex flex-wrap gap-3 pb-4">
            <div className="flex-1 min-w-48">
              <Input
                id="prod-search" label="Search"
                placeholder="Search products…"
                prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="min-w-44">
              <Select id="prod-status" label="Status" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
            <div className="min-w-48">
              <Select id="prod-cat" label="Category" options={catOptions} value={catFilter} onChange={(e) => setCatFilter(e.target.value)} />
            </div>
          </div>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); setFormError(''); }}
        title="New Product"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>Create &amp; Edit</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="p-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))} />
          <Input id="p-slug" label="Slug" required value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <Select id="p-cat" label="Category" required options={[{ value: '', label: 'Select category…' }, ...catOptions.slice(1)]}
            value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="p-price" label="Base Price" type="number" required value={form.basePrice}
                onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
            </div>
            <div className="w-36">
              <CurrencySelector id="p-currency" label="Currency" value={form.currency} onChange={(cur) => setForm((f) => ({ ...f, currency: cur }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
