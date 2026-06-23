'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PayslipStatusBadge } from '@kuraykaraaslan/hr_payroll/ui/payroll-status-badge.component';
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

type Payslip = {
  payslipId: string;
  runId: string;
  employeeId: string;
  gross?: string | null;
  deductions?: string | null;
  net?: string | null;
  status: string;
  createdAt: string;
};
type PayslipForm = {
  runId: string; employeeId: string;
  gross: string; deductions: string; net: string; status: string;
};
const EMPTY_FORM: PayslipForm = { runId: '', employeeId: '', gross: '', deductions: '', net: '', status: 'DRAFT' };
const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'ISSUED', label: 'ISSUED' },
  { value: 'PAID', label: 'PAID' },
];

const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function PayrollPayslipsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows]         = useState<Payslip[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [form, setForm]         = useState<PayslipForm>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/payroll/payslips`, {
        params: { page: p - 1, pageSize: PAGE_SIZE },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load payslips.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() {
    setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false); setForm(EMPTY_FORM); setFormError('');
  }

  async function handleCreate() {
    setSaving(true); setFormError('');
    try {
      await api.post(`/tenant/${tenantId}/api/payroll/payslips`, {
        runId: form.runId,
        employeeId: form.employeeId,
        gross: form.gross !== '' ? Number(form.gross) : undefined,
        deductions: form.deductions !== '' ? Number(form.deductions) : undefined,
        net: form.net !== '' ? Number(form.net) : undefined,
        status: form.status,
      });
      toast.success('Payslip created');
      closeModal();
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create payslip.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: Payslip) {
    if (!confirm('Delete this payslip? This cannot be undone.')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/payroll/payslips/${r.payslipId}`);
      toast.success('Payslip deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete payslip.'));
    }
  }

  const columns: TableColumn<Payslip>[] = [
    { key: 'employeeId', header: 'Employee', render: (r) => <span className="font-medium text-text-primary">{r.employeeId}</span> },
    { key: 'gross', header: 'Gross', render: (r) => <span className="tabular-nums text-text-secondary">{r.gross ?? '—'}</span> },
    { key: 'net', header: 'Net', render: (r) => <span className="tabular-nums text-text-secondary">{r.net ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <PayslipStatusBadge status={r.status} size="sm" /> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Delete', variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payslips"
        subtitle={loading ? '…' : `${total} payslip${total !== 1 ? 's' : ''}`}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/payroll/payslips/settings`, variant: 'ghost' as const },
          { label: 'New Payslip', onClick: openCreate },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.payslipId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        onRowClick={(r) => router.push(`/tenant/${tenantId}/admin/payroll/payslips/${r.payslipId}`)}
        emptyMessage="No payslips yet. Create one to get started."
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="New Payslip"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="payslip-run" label="Run ID" required value={form.runId}
            onChange={(e) => setForm((f) => ({ ...f, runId: e.target.value }))} />
          <Input id="payslip-emp" label="Employee ID" required value={form.employeeId}
            onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} />
          <Input id="payslip-gross" label="Gross" type="number" value={form.gross}
            onChange={(e) => setForm((f) => ({ ...f, gross: e.target.value }))} />
          <Input id="payslip-deductions" label="Deductions" type="number" value={form.deductions}
            onChange={(e) => setForm((f) => ({ ...f, deductions: e.target.value }))} />
          <Input id="payslip-net" label="Net" type="number" value={form.net}
            onChange={(e) => setForm((f) => ({ ...f, net: e.target.value }))} />
          <Select id="payslip-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
