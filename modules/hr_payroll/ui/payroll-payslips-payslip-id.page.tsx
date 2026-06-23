'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { PayslipStatusBadge } from '@kuraykaraaslan/hr_payroll/ui/payroll-status-badge.component';
import { PayslipLinesPanel } from '@kuraykaraaslan/hr_payroll/ui/payslip-lines-panel.component';

type Payslip = {
  payslipId: string; runId: string; employeeId: string;
  gross?: string | null; deductions?: string | null; net?: string | null;
  status: string;
};
type Form = { runId: string; employeeId: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function PayslipDetailPage({ params }: { params: Promise<{ tenantId: string; payslipId: string }> }) {
  const { tenantId, payslipId } = use(params);

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [acting, setActing] = useState(false);
  const [form, setForm] = useState<Form>({ runId: '', employeeId: '' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/payroll/payslips/${payslipId}`);
      const p: Payslip = res.data.item;
      setPayslip(p);
      setForm({ runId: p.runId, employeeId: p.employeeId });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load payslip.'));
    } finally { setLoading(false); }
  }, [tenantId, payslipId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/payroll/payslips/${payslipId}`, {
        runId: form.runId, employeeId: form.employeeId,
      });
      toast.success('Payslip saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function runAction(action: string, label: string) {
    setActing(true);
    try {
      await api.post(`/tenant/${tenantId}/api/payroll/payslips/${payslipId}/${action}`);
      toast.success(`${label} done`);
      load();
    } catch (err) { toast.error(extractMessage(err, `Failed to ${label.toLowerCase()}.`)); }
    finally { setActing(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!payslip) return null;

  const fmt = (v?: string | null) => (v != null ? Number(v).toLocaleString() : '0');

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Payslip Info</h3>
            <Input id="ps-run" label="Run ID" required value={form.runId}
              onChange={(e) => setForm((f) => ({ ...f, runId: e.target.value }))} />
            <Input id="ps-emp" label="Employee ID" required value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Totals</h3>
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Gross</span><span className="tabular-nums text-text-primary">{fmt(payslip.gross)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Deductions</span><span className="tabular-nums text-text-primary">{fmt(payslip.deductions)}</span></div>
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-2"><span className="text-text-primary">Net</span><span className="tabular-nums text-text-primary">{fmt(payslip.net)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    { id: 'lines', label: 'Lines', content: <PayslipLinesPanel tenantId={tenantId} payslipId={payslipId} onRefresh={load} /> },
  ];

  const actions = [
    { label: saving ? 'Saving…' : 'Save', onClick: handleSave, disabled: saving },
  ];
  if (payslip.status === 'DRAFT') {
    actions.push({ label: 'Issue', onClick: () => runAction('issue', 'Issue'), disabled: acting });
  }
  if (payslip.status === 'ISSUED') {
    actions.push({ label: 'Mark Paid', onClick: () => runAction('pay', 'Mark Paid'), disabled: acting });
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Payslips', href: `/tenant/${tenantId}/admin/payroll/payslips` },
        { label: payslip.employeeId },
      ]} />

      <PageHeader
        title={`Payslip — ${payslip.employeeId}`}
        subtitle={`Net ${fmt(payslip.net)}`}
        badge={<PayslipStatusBadge status={payslip.status} />}
        actions={actions}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
