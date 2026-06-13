'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@/modules_next/common/axios';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Modal } from '@/modules_next/common/ui/Modal';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Category = {
  categoryId: string;
  title: string;
  slug: string;
  description?: string | null;
  keywords?: string[] | null;
  createdAt: string;
};

type Form = { title: string; slug: string; description: string; keywords: string };
const EMPTY_FORM: Form = { title: '', slug: '', description: '', keywords: '' };
const PAGE_SIZE = 50;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function BlogCategoriesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Shared create/edit modal state. editing === null → create mode.
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Category | null>(null);
  const [form, setForm]           = useState<Form>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchCategories = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/blog/categories`, {
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
    ? categories.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase()))
    : categories;

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    setForm({ title: c.title, slug: c.slug, description: c.description ?? '', keywords: (c.keywords ?? []).join(', ') });
    setFormError(''); setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false); setEditing(null); setForm(EMPTY_FORM); setFormError('');
  }

  async function handleSubmit() {
    setSaving(true); setFormError('');
    const body = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      description: form.description || undefined,
      keywords: form.keywords ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
    };
    try {
      if (editing) {
        await api.patch(`/tenant/${tenantId}/api/blog/categories/${editing.categoryId}`, body);
        toast.success('Category updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/blog/categories`, body);
        toast.success('Category created');
      }
      closeModal();
      fetchCategories(editing ? page : 1);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save category.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(c: Category) {
    if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/blog/categories/${c.categoryId}`);
      toast.success('Category deleted');
      fetchCategories(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete category.'));
    }
  }

  const columns: TableColumn<Category>[] = [
    {
      key: 'title', header: 'Title',
      render: (c) => (
        <div>
          <p className="font-medium text-text-primary">{c.title}</p>
          <p className="text-xs text-text-secondary">{c.slug}</p>
        </div>
      ),
    },
    {
      key: 'description', header: 'Description',
      render: (c) => <span className="text-text-secondary line-clamp-1">{c.description ?? '—'}</span>,
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
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(c) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(c) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog Categories"
        subtitle={loading ? '…' : `${total} categor${total !== 1 ? 'ies' : 'y'}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Category</>, onClick: openCreate }]}
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
        onRowClick={(c) => openEdit(c)}
        loading={loading}
        emptyMessage="No categories yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="cat-search"
              label="Search"
              placeholder="Filter by title or slug…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Category' : 'New Category'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="cat-title" label="Title" required value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))} />
          <Input id="cat-slug" label="Slug" required value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            hint="URL-friendly identifier, e.g. announcements" />
          <Input id="cat-desc" label="Description" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input id="cat-keywords" label="Keywords" value={form.keywords}
            onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
            hint="Comma-separated" />
        </div>
      </Modal>
    </div>
  );
}
