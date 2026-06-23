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
import { faPlus, faSearch, faPenToSquare, faTrash, faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

type Form = {
  formId: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
};

type FormState = { title: string; slug: string; status: string };
const EMPTY: FormState = { title: '', slug: '', status: 'DRAFT' };
const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'PUBLISHED', label: 'PUBLISHED' },
  { value: 'ARCHIVED', label: 'ARCHIVED' },
];

const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function FormsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<Form[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number, q: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/forms`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load forms.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page, search); }, [page, search, fetchRows]);

  function openCreate() {
    setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true);
  }
  function openEdit(row: Form) {
    setEditingId(row.formId);
    setForm({ title: row.title, slug: row.slug, status: row.status });
    setFormError(''); setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false); setEditingId(null); setForm(EMPTY); setFormError('');
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    try {
      const payload = { title: form.title, slug: form.slug, status: form.status };
      if (editingId) {
        await api.patch(`/tenant/${tenantId}/api/forms/${editingId}`, payload);
        toast.success('Form updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/forms`, payload);
        toast.success('Form created');
      }
      closeModal();
      fetchRows(page, search);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save form.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(row: Form) {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/forms/${row.formId}`);
      toast.success('Form deleted');
      fetchRows(page, search);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete form.'));
    }
  }

  const columns: TableColumn<Form>[] = [
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="text-text-secondary">{r.slug}</span> },
    { key: 'status', header: 'Status', render: (r) => <span className="text-text-secondary">{r.status}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Open', icon: <FontAwesomeIcon icon={faUpRightFromSquare} />, onClick: () => router.push(`/tenant/${tenantId}/admin/forms/${r.formId}`) },
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(r) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forms"
        subtitle={loading ? '…' : `${total} form${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Form</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.formId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(r) => router.push(`/tenant/${tenantId}/admin/forms/${r.formId}`)}
        loading={loading}
        emptyMessage="No forms yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="form-search"
              label="Search"
              placeholder="Filter by title…"
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
        title={editingId ? 'Edit Form' : 'New Form'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editingId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="form-title" label="Title" required value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input id="form-slug" label="Slug" required value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <Select id="form-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
