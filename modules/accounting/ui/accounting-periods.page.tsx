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
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Period = {
  periodId: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  createdAt: string;
};

const PAGE_SIZE = 50;
const STATUS_OPTIONS = ['OPEN', 'CLOSED'].map((v) => ({ value: v, label: v }));

type Form = { name: string; startDate: string; endDate: string; status: string };
const EMPTY_FORM: Form = { name: '', startDate: '', endDate: '', status: 'OPEN' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}
function toDateInput(v?: string | null) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function AccountingPeriodsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [rows, setRows] = useState<Period[]>([]);
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
  const base = `/tenant/${tenantId}/api/accounting/periods`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE, search: search || undefined } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load periods.'));
    } finally { setLoading(false); }
  }, [base, search]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() {
    setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }
  function openEdit(r: Period) {
    setEditId(r.periodId);
    setForm({ name: r.name ?? '', startDate: toDateInput(r.startDate), endDate: toDateInput(r.endDate), status: r.status ?? 'OPEN' });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload: Record<string, unknown> = {
      name: form.name,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      status: form.status,
    };
    try {
      if (editId) await api.patch(`${base}/${editId}`, payload);
      else await api.post(base, payload);
      toast.success(editId ? 'Period updated' : 'Period created');
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save period.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: Period) {
    if (!window.confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`${base}/${r.periodId}`);
      toast.success('Period deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete period.'));
    }
  }

  const columns: TableColumn<Period>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    {
      key: 'startDate', header: 'Start',
      render: (r) => <span className="text-text-secondary">{r.startDate ? new Date(r.startDate).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'endDate', header: 'End',
      render: (r) => <span className="text-text-secondary">{r.endDate ? new Date(r.endDate).toLocaleDateString() : '—'}</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <span className="text-text-secondary">{r.status}</span> },
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
        title="Periods"
        subtitle={loading ? '…' : `${total} period${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Period</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.periodId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No periods yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="period-search"
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
        title={editId ? 'Edit Period' : 'New Period'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="period-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="period-start" label="Start Date" type="date" value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          <Input id="period-end" label="End Date" type="date" value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          <Select id="period-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
