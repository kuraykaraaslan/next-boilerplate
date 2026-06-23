'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RunStatusBadge } from '@kuraykaraaslan/payroll/ui/payroll-status-badge.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';

type Run = {
  runId: string;
  period: string;
  status: string;
  runDate?: string | null;
  createdAt: string;
};
type RunForm = { period: string; status: string; runDate: string };
const EMPTY_FORM: RunForm = { period: '', status: 'DRAFT', runDate: '' };
const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'PROCESSED', label: 'PROCESSED' },
  { value: 'PAID', label: 'PAID' },
];

const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function PayrollRunsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows]         = useState<Run[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<RunForm>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/payroll/runs`, {
        params: { page: p - 1, pageSize: PAGE_SIZE },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load payroll runs.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  const displayed = search
    ? rows.filter((r) => r.period.toLowerCase().includes(search.toLowerCase()))
    : rows;

  function openCreate() {
    setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }
  function openEdit(r: Run) {
    setEditId(r.runId);
    setForm({ period: r.period, status: r.status, runDate: r.runDate ? r.runDate.slice(0, 10) : '' });
    setFormError(''); setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false); setForm(EMPTY_FORM); setEditId(null); setFormError('');
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      period: form.period,
      status: form.status,
      runDate: form.runDate || undefined,
    };
    try {
      if (editId) {
        await api.patch(`/tenant/${tenantId}/api/payroll/runs/${editId}`, payload);
        toast.success('Payroll run updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/payroll/runs`, payload);
        toast.success('Payroll run created');
      }
      closeModal();
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save payroll run.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: Run) {
    if (!confirm(`Delete payroll run "${r.period}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/payroll/runs/${r.runId}`);
      toast.success('Payroll run deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete payroll run.'));
    }
  }

  const columns: TableColumn<Run>[] = [
    { key: 'period', header: 'Period', render: (r) => <span className="font-medium text-text-primary">{r.period}</span> },
    { key: 'status', header: 'Status', render: (r) => <RunStatusBadge status={r.status} size="sm" /> },
    {
      key: 'runDate', header: 'Run Date',
      render: (r) => <span className="text-text-secondary">{r.runDate ? new Date(r.runDate).toLocaleDateString() : '—'}</span>,
    },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', onClick: () => openEdit(r) },
            { label: 'Delete', variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Runs"
        subtitle={loading ? '…' : `${total} run${total !== 1 ? 's' : ''}`}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/payroll/runs/settings`, variant: 'ghost' as const },
          { label: 'New Payroll Run', onClick: openCreate },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={displayed}
        getRowKey={(r) => r.runId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        onRowClick={(r) => router.push(`/tenant/${tenantId}/admin/payroll/runs/${r.runId}`)}
        emptyMessage="No payroll runs yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="run-search"
              label="Search"
              placeholder="Filter by period…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editId ? 'Edit Payroll Run' : 'New Payroll Run'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="run-period" label="Period" required value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} />
          <Select id="run-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          <Input id="run-date" label="Run Date" type="date" value={form.runDate}
            onChange={(e) => setForm((f) => ({ ...f, runDate: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
