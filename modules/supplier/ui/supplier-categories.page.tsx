'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Category = {
  categoryId: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
};

type CategoryForm = { name: string; code: string; isActive: boolean };
const EMPTY_FORM: CategoryForm = { name: '', code: '', isActive: false };
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function SupplierCategoriesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [rows, setRows]         = useState<Category[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Category | null>(null);
  const [form, setForm]           = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number, q: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/suppliers/categories`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load categories.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page, search); }, [page, search, fetchRows]);

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }
  function openEdit(c: Category) {
    setEditing(c);
    setForm({ name: c.name ?? '', code: c.code ?? '', isActive: !!c.isActive });
    setFormError(''); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); setForm(EMPTY_FORM); setFormError(''); }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = { name: form.name, code: form.code, isActive: form.isActive };
    try {
      if (editing) {
        await api.patch(`/tenant/${tenantId}/api/suppliers/categories/${editing.categoryId}`, payload);
        toast.success('Category updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/suppliers/categories`, payload);
        toast.success('Category created');
      }
      closeModal();
      fetchRows(page, search);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save category.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(c: Category) {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/suppliers/categories/${c.categoryId}`);
      toast.success('Category deleted');
      fetchRows(page, search);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete category.'));
    }
  }

  const columns: TableColumn<Category>[] = [
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium text-text-primary">{c.name}</span> },
    { key: 'code', header: 'Code', render: (c) => <span className="text-text-secondary">{c.code}</span> },
    {
      key: 'isActive', header: 'Active',
      render: (c) => (
        <Badge variant={c.isActive ? 'success' : 'neutral'} size="sm" dot>
          {c.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
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
        title="Categories"
        subtitle={loading ? '…' : `${total} categor${total !== 1 ? 'ies' : 'y'}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Category</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(c) => c.categoryId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No categories yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="supcat-search"
              label="Search"
              placeholder="Filter by name…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
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
            <Button variant="primary" onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="supcat-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="supcat-code" label="Code" required value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Select id="supcat-active" label="Active"
            options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]}
            value={form.isActive ? 'true' : 'false'}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))} />
        </div>
      </Modal>
    </div>
  );
}
