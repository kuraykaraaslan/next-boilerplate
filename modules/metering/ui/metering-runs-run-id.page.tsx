'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { BillingRunStatusBadge, type BillingRunStatus } from '@kuraykaraaslan/metering/ui/billing-run-status-badge.component';
import { BillingRunLinesPanel } from '@kuraykaraaslan/metering/ui/billing-run-lines-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalculator, faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons';

type RunLine = {
  meterKey: string;
  usedQuantity: string;
  includedQuantity: string;
  billableQuantity: string;
  unitPriceMinor: string;
  amountMinor: string;
};

type Run = {
  billingRunId: string;
  subjectType: string;
  subjectId: string | null;
  periodKey: string;
  status: BillingRunStatus;
  currency: string;
  totalMinor: string;
  walletDebitedMinor: string;
  invoicedMinor: string;
  invoiceId: string | null;
  lines: RunLine[] | null;
  error: string | null;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const TRANSITIONS: { action: string; label: string; from: BillingRunStatus[]; icon: typeof faCalculator }[] = [
  { action: 'calculate', label: 'Calculate', from: ['DRAFT', 'CALCULATED'], icon: faCalculator },
  { action: 'bill', label: 'Bill', from: ['CALCULATED'], icon: faFileInvoiceDollar },
];

export default function BillingRunDetailPage({ params }: { params: Promise<{ tenantId: string; runId: string }> }) {
  const { tenantId, runId } = use(params);

  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/metering/runs/${runId}`);
      setRun(res.data.item);
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load billing run.'));
    } finally { setLoading(false); }
  }, [tenantId, runId]);

  useEffect(() => { load(); }, [load]);

  async function runTransition(action: string) {
    setWorking(true);
    try {
      await api.post(`/tenant/${tenantId}/api/metering/runs/${runId}/${action}`, {});
      toast.success(`Run ${action === 'calculate' ? 'calculated' : 'billed'}`);
      load();
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action}.`));
    } finally { setWorking(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!run) return null;

  // "Total billable usage" — sum of per-meter billable quantities across lines.
  const totalBillable = (run.lines ?? []).reduce((acc, l) => acc + BigInt(l.billableQuantity || '0'), BigInt(0)).toString();

  const availableActions = TRANSITIONS.filter((t) => t.from.includes(run.status)).map((t) => ({
    label: <><FontAwesomeIcon icon={t.icon} /> {t.label}</>,
    onClick: () => runTransition(t.action),
    disabled: working,
  }));

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Header</h3>
            <div className="flex gap-3">
              <div className="flex-1"><Input id="r-period" label="Period" value={run.periodKey} readOnly /></div>
              <div className="flex-1"><Input id="r-currency" label="Currency" value={run.currency} readOnly /></div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1"><Input id="r-subjectType" label="Subject type" value={run.subjectType} readOnly /></div>
              <div className="flex-1"><Input id="r-subjectId" label="Subject" value={run.subjectId ?? '(tenant-wide)'} readOnly /></div>
            </div>
            {run.error && <AlertBanner variant="error" message={run.error} />}
          </div>
        </Card>

        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Computed lines</h3>
            {(run.lines ?? []).length === 0 ? (
              <p className="text-sm text-text-secondary">No lines yet — calculate this run to derive them.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-secondary border-b border-border">
                    <th className="text-left py-1 font-medium">Meter</th>
                    <th className="text-right py-1 font-medium">Used</th>
                    <th className="text-right py-1 font-medium">Included</th>
                    <th className="text-right py-1 font-medium">Billable</th>
                    <th className="text-right py-1 font-medium">Amount (minor)</th>
                  </tr>
                </thead>
                <tbody>
                  {(run.lines ?? []).map((l) => (
                    <tr key={l.meterKey} className="border-b border-border/50">
                      <td className="py-1 font-mono text-text-primary">{l.meterKey}</td>
                      <td className="py-1 text-right tabular-nums text-text-secondary">{l.usedQuantity}</td>
                      <td className="py-1 text-right tabular-nums text-text-secondary">{l.includedQuantity}</td>
                      <td className="py-1 text-right tabular-nums text-text-primary">{l.billableQuantity}</td>
                      <td className="py-1 text-right tabular-nums text-text-primary">{l.amountMinor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
            <Row label="Status"><BillingRunStatusBadge status={run.status} size="sm" /></Row>
            <Row label="Total billable usage"><span className="tabular-nums font-semibold text-text-primary">{totalBillable}</span></Row>
            <Row label="Total (minor)"><span className="tabular-nums text-text-primary">{run.totalMinor} {run.currency}</span></Row>
            <Row label="Wallet debited"><span className="tabular-nums text-text-secondary">{run.walletDebitedMinor}</span></Row>
            <Row label="Invoiced"><span className="tabular-nums text-text-secondary">{run.invoicedMinor}</span></Row>
            {run.invoiceId && <Row label="Invoice"><span className="font-mono text-text-secondary">{run.invoiceId.slice(0, 8)}…</span></Row>}
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    { id: 'lines', label: 'Usage events', content: <BillingRunLinesPanel tenantId={tenantId} runId={runId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Metering', href: `/tenant/${tenantId}/admin/metering` },
        { label: `Run ${run.periodKey}` },
      ]} />

      <PageHeader
        title={`Billing run · ${run.periodKey}`}
        subtitle={`${run.subjectType}${run.subjectId ? `: ${run.subjectId.slice(0, 8)}…` : ''}`}
        badge={<BillingRunStatusBadge status={run.status} />}
        actions={availableActions}
      />

      <TabGroup tabs={tabs} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
    </div>
  );
}
