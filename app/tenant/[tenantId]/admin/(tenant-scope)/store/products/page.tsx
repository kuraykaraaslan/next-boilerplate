'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/modules_next/common/axios';
import { ServerDataTable } from '@/modules_next/common/ui/ServerDataTable';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
import { buildProductColumns, type ProductRow } from '@/modules_next/store/ui/product-list-columns';
import { ProductCreateModal } from '@/modules_next/store/ui/ProductCreateModal';

type Category = { categoryId: string; name: string };
const PAGE_SIZE = 20;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function StoreProductsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

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

  async function handleDuplicate(p: ProductRow) {
    try {
      const res = await api.post(`/tenant/${tenantId}/api/store/products/${p.productId}/duplicate`);
      toast.success('Product duplicated');
      router.push(`/tenant/${tenantId}/admin/store/products/${res.data.product.productId}`);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to duplicate.'));
    }
  }

  async function handleDelete(p: ProductRow) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/products/${p.productId}`);
      toast.success('Product deleted');
      fetchProducts(page, search, status, catFilter);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete.'));
    }
  }

  const columns = buildProductColumns({
    onEdit:      (p) => router.push(`/tenant/${tenantId}/admin/store/products/${p.productId}`),
    onDuplicate: handleDuplicate,
    onDelete:    handleDelete,
  });

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
        page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/tenant/${tenantId}/admin/store/products/${p.productId}`)}
        loading={loading}
        emptyMessage="No products yet."
        toolbar={
          <div className="flex flex-wrap gap-3 pb-4">
            <div className="flex-1 min-w-48">
              <Input
                id="prod-search" label="Search" placeholder="Search products…"
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

      <ProductCreateModal
        open={showCreate}
        tenantId={tenantId}
        categories={categories}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => router.push(`/tenant/${tenantId}/admin/store/products/${id}`)}
      />
    </div>
  );
}
