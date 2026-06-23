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
import { ReturnStatusBadge, type ReturnStatus } from '@kuraykaraaslan/payment_return_rma/ui/return-status-badge.component';
import { ReturnLinesPanel } from '@kuraykaraaslan/payment_return_rma/ui/return-lines-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCheck, faXmark, faBoxOpen, faMoneyBillTransfer, faFlagCheckered, faBan } from '@fortawesome/free-solid-svg-icons';

type ReturnEvent = { returnEventId: string; status: string; message?: string | null; createdAt: string };

type ReturnReq = {
  returnRequestId: string;
  rmaNumber: string;
  orderId: string;
  status: ReturnStatus;
  type: string;
  reason?: string | null;
  adminNote?: string | null;
  refundAmount?: number | null;
  currency?: string | null;
  events?: ReturnEvent[];
};

type Form = { reason: string; adminNote: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const TRANSITIONS: { action: string; label: string; from: ReturnStatus[]; icon: typeof faCheck }[] = [
  { action: 'approve',  label: 'Approve',  from: ['REQUESTED'], icon: faCheck },
  { action: 'reject',   label: 'Reject',   from: ['REQUESTED'], icon: faXmark },
  { action: 'receive',  label: 'Receive',  from: ['APPROVED'], icon: faBoxOpen },
  { action: 'refund',   label: 'Refund',   from: ['RECEIVED', 'APPROVED'], icon: faMoneyBillTransfer },
  { action: 'complete', label: 'Complete', from: ['REFUNDED', 'RECEIVED'], icon: faFlagCheckered },
  { action: 'cancel',   label: 'Cancel',   from: ['REQUESTED', 'APPROVED', 'RECEIVED'], icon: faBan },
];

export default function ReturnDetailPage({ params }: { params: Promise<{ tenantId: string; returnId: string }> }) {
  const { tenantId, returnId } = use(params);

  const [ret, setRet] = useState<ReturnReq | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [working, setWorking] = useState(false);

  const [form, setForm] = useState<Form>({ reason: '', adminNote: '' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/returns/${returnId}`);
      const r: ReturnReq = res.data.item;
      setRet(r);
      setForm({ reason: r.reason ?? '', adminNote: r.adminNote ?? '' });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load return.'));
    } finally { setLoading(false); }
  }, [tenantId, returnId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/returns/${returnId}`, {
        adminNote: form.adminNote || undefined,
      });
      toast.success('Return saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function runTransition(action: string) {
    setWorking(true);
    try {
      await api.post(`/tenant/${tenantId}/api/returns/${returnId}/${action}`, {});
      toast.success(`Return ${action} done`);
      load();
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action}.`));
    } finally { setWorking(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!ret) return null;

  function fmtTotal() {
    const v = Number(ret!.refundAmount) || 0;
    if (!ret!.currency) return v.toFixed(2);
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: ret!.currency }).format(v); }
    catch { return `${v.toFixed(2)} ${ret!.currency}`; }
  }

  const availableActions = TRANSITIONS.filter((t) => t.from.includes(ret.status)).map((t) => ({
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
            <Input id="r-order" label="Order ID" value={ret.orderId} readOnly />
            <Input id="r-reason" label="Reason" value={form.reason} readOnly />
            <Input id="r-note" label="Admin note" value={form.adminNote}
              onChange={(e) => setForm((f) => ({ ...f, adminNote: e.target.value }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Status</span>
              <ReturnStatusBadge status={ret.status} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Type</span>
              <span className="text-text-primary">{ret.type}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Refund</span>
              <span className="tabular-nums font-semibold text-text-primary">{fmtTotal()}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const timelineContent = (
    <Card>
      <div className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Status timeline</h3>
        {(!ret.events || ret.events.length === 0) ? (
          <p className="text-sm text-text-secondary">No events yet.</p>
        ) : (
          <ol className="space-y-3">
            {ret.events.map((ev) => (
              <li key={ev.returnEventId} className="flex items-start gap-3 text-sm">
                <ReturnStatusBadge status={ev.status} size="sm" dot />
                <div className="flex-1">
                  {ev.message && <span className="text-text-primary">{ev.message}</span>}
                  <div className="text-xs text-text-secondary">{new Date(ev.createdAt).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'lines', label: 'Items',
      content: <ReturnLinesPanel tenantId={tenantId} returnId={returnId} currency={ret.currency} onRefresh={load} />,
    },
    { id: 'timeline', label: 'Timeline', content: timelineContent },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Returns', href: `/tenant/${tenantId}/admin/returns` },
        { label: ret.rmaNumber },
      ]} />

      <PageHeader
        title={ret.rmaNumber}
        subtitle={fmtTotal()}
        badge={<ReturnStatusBadge status={ret.status} />}
        actions={[
          ...availableActions,
          { label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving },
        ]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
