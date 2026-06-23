'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type ProductTag = {
  tagId: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
};

const PAGE_SIZE = 50;

type Form = { name: string; slug: string; isActive: string };
const EMPTY_FORM: Form = { name: '', slug: '', isActive: 'true' };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function ProductTagsPanel({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<ProductTag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/tenant/${tenantId}/api/store/product-tags`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE, search: search || undefined } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load product tags.'));
    } finally { setLoading(false); }
  }, [base, search]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() {
    setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }
  function openEdit(r: ProductTag) {
    setEditId(r.tagId);
    setForm({ name: r.name ?? '', slug: r.slug ?? '', isActive: r.isActive ? 'true' : 'false' });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = { name: form.name, slug: form.slug || slugify(form.name), isActive: form.isActive === 'true' };
    try {
      if (editId) await api.patch(`${base}/${editId}`, payload);
      else await api.post(base, payload);
      toast.success(editId ? 'Tag updated' : 'Tag created');
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save tag.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: ProductTag) {
    if (!window.confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`${base}/${r.tagId}`);
      toast.success('Tag deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete tag.'));
    }
  }

  const columns: TableColumn<ProductTag>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="text-text-secondary">{r.slug}</span> },
    { key: 'isActive', header: 'Status', render: (r) => (
      <Badge variant={r.isActive ? 'success' : 'neutral'} size="sm">{r.isActive ? 'Active' : 'Inactive'}</Badge>
    ) },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(r) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.tagId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No product tags yet. Create one to get started."
        headerRight={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} /> New Tag
          </Button>
        }
        toolbar={
          <div className="pb-4">
            <Input
              id="tag-search"
              label="Search"
              placeholder="Filter by name…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Tag' : 'New Tag'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="tag-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editId ? f.slug : slugify(e.target.value) }))} />
          <Input id="tag-slug" label="Slug" required value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <Select id="tag-active" label="Status"
            options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
            value={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
