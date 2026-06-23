'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Supplier = {
  supplierId: string;
  name: string;
  code: string;
  categoryId?: string | null;
  email?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  isActive: boolean;
  createdAt: string;
};

type CategoryOption = { categoryId: string; name: string };

type SupplierForm = {
  name: string;
  code: string;
  categoryId: string;
  email: string;
  phone: string;
  taxNumber: string;
  isActive: boolean;
};

const EMPTY_FORM: SupplierForm = { name: '', code: '', categoryId: '', email: '', phone: '', taxNumber: '', isActive: false };
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function SuppliersPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows]         = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Supplier | null>(null);
  const [form, setForm]           = useState<SupplierForm>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number, q: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/suppliers`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load suppliers.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get(`/tenant/${tenantId}/api/suppliers/categories`, {
        params: { page: 0, pageSize: 200 },
      });
      setCategories(res.data.data ?? []);
    } catch { /* non-fatal */ }
  }, [tenantId]);

  useEffect(() => { fetchRows(page, search); }, [page, search, fetchRows]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name ?? '',
      code: s.code ?? '',
      categoryId: s.categoryId ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      taxNumber: s.taxNumber ?? '',
      isActive: !!s.isActive,
    });
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      name: form.name,
      code: form.code,
      categoryId: form.categoryId || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      taxNumber: form.taxNumber || undefined,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await api.patch(`/tenant/${tenantId}/api/suppliers/${editing.supplierId}`, payload);
        toast.success('Supplier updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/suppliers`, payload);
        toast.success('Supplier created');
      }
      closeModal();
      fetchRows(page, search);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save supplier.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(s: Supplier) {
    if (!window.confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/suppliers/${s.supplierId}`);
      toast.success('Supplier deleted');
      fetchRows(page, search);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete supplier.'));
    }
  }

  const columns: TableColumn<Supplier>[] = [
    { key: 'name', header: 'Name', render: (s) => <span className="font-medium text-text-primary">{s.name}</span> },
    { key: 'code', header: 'Code', render: (s) => <span className="text-text-secondary">{s.code}</span> },
    { key: 'email', header: 'Email', render: (s) => <span className="text-text-secondary">{s.email ?? '—'}</span> },
    { key: 'isActive', header: 'Active', render: (s) => <span className="text-text-secondary">{s.isActive ? 'Yes' : 'No'}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(s) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(s) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle={loading ? '…' : `${total} supplier${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Supplier</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(s) => s.supplierId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(s) => router.push(`/tenant/${tenantId}/admin/suppliers/${s.supplierId}`)}
        loading={loading}
        emptyMessage="No suppliers yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="supplier-search"
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
        title={editing ? 'Edit Supplier' : 'New Supplier'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="supplier-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="supplier-code" label="Code" required value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Select id="supplier-category" label="Category"
            options={[{ value: '', label: '— None —' }, ...categories.map((c) => ({ value: c.categoryId, label: c.name }))]}
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} />
          <Input id="supplier-email" label="Email" value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input id="supplier-phone" label="Phone" value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input id="supplier-tax" label="Tax Number" value={form.taxNumber}
            onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))} />
          <Select id="supplier-active" label="Active"
            options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]}
            value={form.isActive ? 'true' : 'false'}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))} />
        </div>
      </Modal>
    </div>
  );
}
