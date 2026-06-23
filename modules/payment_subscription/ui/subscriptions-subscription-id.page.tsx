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
import { SubscriptionStatusBadge, type SubscriptionStatus } from '@kuraykaraaslan/payment_subscription/ui/subscription-status-badge.component';
import { SubscriptionLinesPanel } from '@kuraykaraaslan/payment_subscription/ui/subscription-lines-panel.component';
import { SubscriptionEventsPanel } from '@kuraykaraaslan/payment_subscription/ui/subscription-events-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPause, faPlay, faBan, faHourglassEnd } from '@fortawesome/free-solid-svg-icons';

type Subscription = {
  subscriptionId: string;
  planId: string;
  provider: string;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  userId?: string | null;
  status: SubscriptionStatus;
  billingCycle: string;
  amount: number;
  currency: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
};

type Form = { userId: string; providerSubscriptionId: string; providerCustomerId: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const TRANSITIONS: { action: string; label: string; from: SubscriptionStatus[]; icon: typeof faPause }[] = [
  { action: 'pause',  label: 'Pause',  from: ['ACTIVE', 'TRIALING'], icon: faPause },
  { action: 'resume', label: 'Resume', from: ['PAUSED'], icon: faPlay },
  { action: 'cancel', label: 'Cancel', from: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'PAUSED'], icon: faBan },
  { action: 'expire', label: 'Expire', from: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'PAUSED'], icon: faHourglassEnd },
];

export default function SubscriptionDetailPage({ params }: { params: Promise<{ tenantId: string; subscriptionId: string }> }) {
  const { tenantId, subscriptionId } = use(params);

  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [working, setWorking] = useState(false);

  const [form, setForm] = useState<Form>({ userId: '', providerSubscriptionId: '', providerCustomerId: '' });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/subscriptions/${subscriptionId}`);
      const s: Subscription = res.data.item;
      setSub(s);
      setForm({
        userId: s.userId ?? '',
        providerSubscriptionId: s.providerSubscriptionId ?? '',
        providerCustomerId: s.providerCustomerId ?? '',
      });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load subscription.'));
    } finally { setLoading(false); }
  }, [tenantId, subscriptionId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/subscriptions/${subscriptionId}`, {
        userId: form.userId || undefined,
        providerSubscriptionId: form.providerSubscriptionId || undefined,
        providerCustomerId: form.providerCustomerId || undefined,
      });
      toast.success('Subscription saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  async function runTransition(action: string) {
    setWorking(true);
    try {
      await api.post(`/tenant/${tenantId}/api/subscriptions/${subscriptionId}/${action}`, {});
      toast.success(`Subscription ${action}d`);
      load();
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action}.`));
    } finally { setWorking(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!sub) return null;

  function fmtAmount() {
    const v = Number(sub!.amount) || 0;
    if (!sub!.currency) return v.toFixed(2);
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: sub!.currency }).format(v); }
    catch { return `${v.toFixed(2)} ${sub!.currency}`; }
  }

  const availableActions = TRANSITIONS.filter((t) => t.from.includes(sub.status)).map((t) => ({
    label: <><FontAwesomeIcon icon={t.icon} /> {t.label}</>,
    onClick: () => runTransition(t.action),
    disabled: working,
  }));

  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—';

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Header</h3>
            <Input id="s-plan" label="Plan ID" value={sub.planId} disabled onChange={() => {}} />
            <Input id="s-user" label="User ID" value={form.userId}
              onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} />
            <div className="flex gap-3">
              <div className="flex-1">
                <Input id="s-prov-sub" label="Provider Subscription ID" value={form.providerSubscriptionId}
                  onChange={(e) => setForm((f) => ({ ...f, providerSubscriptionId: e.target.value }))} />
              </div>
              <div className="flex-1">
                <Input id="s-prov-cust" label="Provider Customer ID" value={form.providerCustomerId}
                  onChange={(e) => setForm((f) => ({ ...f, providerCustomerId: e.target.value }))} />
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Status</span>
              <SubscriptionStatusBadge status={sub.status} size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Provider</span>
              <span className="text-text-primary">{sub.provider}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Billing cycle</span>
              <span className="text-text-primary">{sub.billingCycle}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Current period end</span>
              <span className="text-text-primary">{periodEnd}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Recurring</span>
              <span className="tabular-nums font-semibold text-text-primary">{fmtAmount()}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    {
      id: 'lines', label: 'Plan Features',
      content: <SubscriptionLinesPanel tenantId={tenantId} subscriptionId={subscriptionId} onRefresh={load} />,
    },
    {
      id: 'events', label: 'Events',
      content: <SubscriptionEventsPanel tenantId={tenantId} subscriptionId={subscriptionId} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Subscriptions', href: `/tenant/${tenantId}/admin/subscriptions` },
        { label: sub.subscriptionId.slice(0, 8) },
      ]} />

      <PageHeader
        title={`Subscription ${sub.subscriptionId.slice(0, 8)}`}
        subtitle={fmtAmount()}
        badge={<SubscriptionStatusBadge status={sub.status} />}
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
