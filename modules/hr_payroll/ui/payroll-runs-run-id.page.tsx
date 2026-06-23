'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { RunStatusBadge, PayslipStatusBadge } from '@kuraykaraaslan/hr_payroll/ui/payroll-status-badge.component';

type Run = { runId: string; period: string; status: string; runDate?: string | null };
type Payslip = { payslipId: string; employeeId: string; net?: string | null; status: string };
type Form = { period: string; runDate: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function PayrollRunDetailPage({ params }: { params: Promise<{ tenantId: string; runId: string }> }) {
  const { tenantId, runId } = use(params);
  const router = useRouter();

  const [run, setRun] = useState<Run | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [acting, setActing] = useState(false);
  const [form, setForm] = useState<Form>({ period: '', runDate: '' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [runRes, psRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/payroll/runs/${runId}`),
        api.get(`/tenant/${tenantId}/api/payroll/payslips`, { params: { runId, pageSize: 100 } }),
      ]);
      const r: Run = runRes.data.item;
      setRun(r);
      setForm({ period: r.period, runDate: r.runDate ? r.runDate.slice(0, 10) : '' });
      setPayslips(psRes.data.data ?? []);
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load payroll run.'));
    } finally { setLoading(false); }
  }, [tenantId, runId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/payroll/runs/${runId}`, {
        period: form.period, runDate: form.runDate || undefined,
      });
      toast.success('Payroll run saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function runAction(action: string, label: string) {
    setActing(true);
    try {
      await api.post(`/tenant/${tenantId}/api/payroll/runs/${runId}/${action}`);
      toast.success(`${label} done`);
      load();
    } catch (err) { toast.error(extractMessage(err, `Failed to ${label.toLowerCase()}.`)); }
    finally { setActing(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!run) return null;

  const columns: TableColumn<Payslip>[] = [
    { key: 'employeeId', header: 'Employee', render: (r) => <span className="font-medium text-text-primary">{r.employeeId}</span> },
    { key: 'net', header: 'Net', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.net ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => <PayslipStatusBadge status={r.status} size="sm" /> },
  ];

  const generalContent = (
    <Card>
      <div className="p-6 space-y-4 max-w-lg">
        <h3 className="text-sm font-semibold text-text-primary">Run Info</h3>
        <Input id="run-period" label="Period" required value={form.period}
          onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} />
        <Input id="run-date" label="Run Date" type="date" value={form.runDate}
          onChange={(e) => setForm((f) => ({ ...f, runDate: e.target.value }))} />
      </div>
    </Card>
  );

  const payslipsContent = (
    <ServerDataTable
      columns={columns}
      rows={payslips}
      getRowKey={(r) => r.payslipId}
      page={1}
      totalPages={1}
      total={payslips.length}
      onPageChange={() => {}}
      hidePagination
      onRowClick={(r) => router.push(`/tenant/${tenantId}/admin/payroll/payslips/${r.payslipId}`)}
      emptyMessage="No payslips in this run yet."
    />
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    { id: 'payslips', label: `Payslips (${payslips.length})`, content: payslipsContent },
  ];

  const actions = [
    { label: saving ? 'Saving…' : 'Save', onClick: handleSave, disabled: saving },
  ];
  if (run.status === 'DRAFT') {
    actions.push({ label: 'Process', onClick: () => runAction('process', 'Process'), disabled: acting });
  }
  if (run.status === 'PROCESSED') {
    actions.push({ label: 'Mark Paid', onClick: () => runAction('pay', 'Mark Paid'), disabled: acting });
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Payroll Runs', href: `/tenant/${tenantId}/admin/payroll/runs` },
        { label: run.period },
      ]} />

      <PageHeader
        title={run.period}
        subtitle={run.runDate ? new Date(run.runDate).toLocaleDateString() : undefined}
        badge={<RunStatusBadge status={run.status} />}
        actions={actions}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
