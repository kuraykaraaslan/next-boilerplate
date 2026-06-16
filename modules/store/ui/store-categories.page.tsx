'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@nb/common/server/axios';
import { ServerDataTable, type TableColumn } from '@nb/common/ui/server-data-table.component';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Modal } from '@nb/common/ui/modal.component';
import { Select } from '@nb/common/ui/select.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { Badge } from '@nb/common/ui/badge.component';
import { RowActionsMenu } from '@nb/common/ui/row-actions-menu.component';
import { toast } from '@nb/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Category = {
  categoryId: string;
  parentId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

type CreateForm = { name: string; slug: string; description: string; sortOrder: string; isActive: boolean };
const EMPTY_FORM: CreateForm = { name: '', slug: '', description: '', sortOrder: '0', isActive: true };
const PAGE_SIZE = 50;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function StoreCategoriesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchCategories = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/categories`, {
        params: { page: p - 1, pageSize: PAGE_SIZE },
      });
      setCategories(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load categories.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchCategories(page); }, [page, fetchCategories]);

  const displayed = search
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase()))
    : categories;

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      await api.post(`/tenant/${tenantId}/api/store/categories`, {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || undefined,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      });
      toast.success('Category created');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchCategories(1);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create category.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(categoryId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/store/categories/${categoryId}`);
      toast.success('Category deleted');
      fetchCategories(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete category.'));
    }
  }

  const columns: TableColumn<Category>[] = [
    {
      key: 'name', header: 'Name',
      render: (c) => (
        <div>
          <p className="font-medium text-text-primary">{c.name}</p>
          <p className="text-xs text-text-secondary">{c.slug}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (c) => (
        <Badge variant={c.isActive ? 'success' : 'neutral'} size="sm" dot>
          {c.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'sortOrder', header: 'Order',
      render: (c) => <span className="tabular-nums text-text-secondary">{c.sortOrder}</span>,
    },
    {
      key: 'createdAt', header: 'Created',
      render: (c) => <span className="text-text-secondary">{new Date(c.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            {
              label: 'Edit',
              icon: <FontAwesomeIcon icon={faPenToSquare} />,
              onClick: () => router.push(`/tenant/${tenantId}/admin/store/categories/${c.categoryId}`),
            },
            {
              label: 'Delete',
              icon: <FontAwesomeIcon icon={faTrash} />,
              variant: 'danger',
              onClick: () => handleDelete(c.categoryId, c.name),
            },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle={loading ? '…' : `${total} categor${total !== 1 ? 'ies' : 'y'}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Category</>, onClick: () => setShowCreate(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={displayed}
        getRowKey={(c) => c.categoryId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(c) => router.push(`/tenant/${tenantId}/admin/store/categories/${c.categoryId}`)}
        loading={loading}
        emptyMessage="No categories yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="cat-search"
              label="Search"
              placeholder="Filter by name or slug…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); setFormError(''); }}
        title="New Category"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input
            id="cat-name"
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
          />
          <Input
            id="cat-slug"
            label="Slug"
            required
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            hint="URL-friendly identifier, e.g. electronics"
          />
          <Input
            id="cat-desc"
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            id="cat-order"
            label="Sort Order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
