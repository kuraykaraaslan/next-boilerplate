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
import { JournalEntryStatusBadge } from './journal-entry-status-badge.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash, faGear } from '@fortawesome/free-solid-svg-icons';

type Entry = {
  entryId: string;
  number: string;
  description?: string | null;
  status: string;
  entryDate?: string | null;
  createdAt: string;
};

const PAGE_SIZE = 50;
const STATUS_OPTIONS = ['DRAFT', 'POSTED', 'VOID'].map((v) => ({ value: v, label: v }));

type Form = { number: string; description: string; status: string; entryDate: string };
const EMPTY_FORM: Form = { number: '', description: '', status: 'DRAFT', entryDate: '' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}
function toDateInput(v?: string | null) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function AccountingJournalPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<Entry[]>([]);
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
  const base = `/tenant/${tenantId}/api/accounting/journal`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE, search: search || undefined } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load journal entries.'));
    } finally { setLoading(false); }
  }, [base, search]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() {
    setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }
  function openEdit(r: Entry) {
    setEditId(r.entryId);
    setForm({ number: r.number ?? '', description: r.description ?? '', status: r.status ?? 'DRAFT', entryDate: toDateInput(r.entryDate) });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload: Record<string, unknown> = {
      number: form.number,
      description: form.description || undefined,
      status: form.status,
      entryDate: form.entryDate || undefined,
    };
    try {
      if (editId) await api.patch(`${base}/${editId}`, payload);
      else await api.post(base, payload);
      toast.success(editId ? 'Entry updated' : 'Entry created');
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save entry.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: Entry) {
    if (!window.confirm(`Delete entry "${r.number}"? This cannot be undone.`)) return;
    try {
      await api.delete(`${base}/${r.entryId}`);
      toast.success('Entry deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete entry.'));
    }
  }

  const columns: TableColumn<Entry>[] = [
    { key: 'number', header: 'Number', render: (r) => <span className="font-medium text-text-primary">{r.number}</span> },
    { key: 'status', header: 'Status', render: (r) => <JournalEntryStatusBadge status={r.status} /> },
    {
      key: 'entryDate', header: 'Date',
      render: (r) => <span className="text-text-secondary">{r.entryDate ? new Date(r.entryDate).toLocaleDateString() : '—'}</span>,
    },
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
      <PageHeader
        title="Journal"
        subtitle={loading ? '…' : `${total} entr${total !== 1 ? 'ies' : 'y'}`}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/accounting/journal/settings`, variant: 'ghost' as const },
          { label: <><FontAwesomeIcon icon={faPlus} /> New Entry</>, onClick: openCreate },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.entryId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(r) => router.push(`/tenant/${tenantId}/admin/accounting/journal/${r.entryId}`)}
        loading={loading}
        emptyMessage="No journal entries yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="journal-search"
              label="Search"
              placeholder="Filter by number…"
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
        title={editId ? 'Edit Entry' : 'New Entry'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="journal-number" label="Number" required value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
          <Input id="journal-description" label="Description" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Select id="journal-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          <Input id="journal-date" label="Entry Date" type="date" value={form.entryDate}
            onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
