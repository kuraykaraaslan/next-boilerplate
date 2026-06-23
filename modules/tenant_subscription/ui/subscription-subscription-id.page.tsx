'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { SubscriptionStatusBadge } from '@kuraykaraaslan/tenant_subscription/ui/subscription-status-badge.component';
import { intervalLabel, formatDate, formatPrice } from '@kuraykaraaslan/tenant_subscription/ui/subscription.helpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateRight, faBan, faHourglassHalf, faCircleStop, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import type { TenantSubscriptionWithPlan } from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.types';

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

// Workflow transitions: ACTIVE/TRIALING -> PAST_DUE (grace) -> EXPIRED, plus -> CANCELLED, plus renew -> ACTIVE.
const TRANSITIONS: { action: string; label: string; from: string[]; icon: typeof faRotateRight }[] = [
  { action: 'renew', label: 'Renew', from: ['PAST_DUE', 'EXPIRED', 'CANCELLED', 'TRIALING'], icon: faRotateRight },
  { action: 'start-grace', label: 'Start Grace', from: ['ACTIVE', 'TRIALING'], icon: faHourglassHalf },
  { action: 'expire', label: 'Expire', from: ['ACTIVE', 'TRIALING', 'PAST_DUE'], icon: faCircleStop },
  { action: 'cancel', label: 'Cancel', from: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'EXPIRED'], icon: faBan },
];

export default function SubscriptionDetailPage({ params }: { params: Promise<{ tenantId: string; subscriptionId: string }> }) {
  const { tenantId, subscriptionId } = use(params);

  const [sub, setSub] = useState<TenantSubscriptionWithPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/subscription/admin/${subscriptionId}`);
      setSub(res.data.item);
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load subscription.'));
    } finally { setLoading(false); }
  }, [tenantId, subscriptionId]);

  useEffect(() => { load(); }, [load]);

  async function runTransition(action: string) {
    setWorking(true);
    try {
      await api.post(`/tenant/${tenantId}/api/subscription/admin/${subscriptionId}/${action}`);
      toast.success(`Subscription ${action.replace('-', ' ')} applied`);
      load();
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action}.`));
    } finally { setWorking(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!sub) return null;

  const planName = sub.plan.product?.name ?? 'Plan';
  const price = Number(sub.plan.product?.basePrice ?? 0);
  const currency = sub.plan.product?.currency ?? 'USD';

  const availableActions = TRANSITIONS.filter((t) => t.from.includes(sub.status)).map((t) => ({
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Field label="Plan">{planName}</Field>
              <Field label="Plan Key"><span className="font-mono text-xs">{sub.planId}</span></Field>
              <Field label="Status"><SubscriptionStatusBadge status={sub.status} size="sm" /></Field>
              <Field label="Billing Interval">{intervalLabel(sub.billingInterval)}</Field>
              <Field label="Current Period Start">{formatDate(sub.currentPeriodStart)}</Field>
              <Field label="Expires At">{formatDate(sub.currentPeriodEnd)}</Field>
              <Field label="Trial Ends">{formatDate(sub.trialEndsAt)}</Field>
              <Field label="Grace Ends">{formatDate(sub.gracePeriodEndsAt)}</Field>
              <Field label="Cancelled At">{formatDate(sub.cancelledAt)}</Field>
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
              <span className="text-text-secondary">Price</span>
              <span className="tabular-nums font-semibold text-text-primary">{formatPrice(price, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Expires</span>
              <span className="text-text-primary">{formatDate(sub.currentPeriodEnd)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const featuresContent = (
    <Card>
      <div className="p-6 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Plan Features</h3>
        {sub.plan.features.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">This plan has no features.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sub.plan.features.map((f) => (
              <li key={f.featureId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-text-primary">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3.5 h-3.5 text-success" />
                  {f.label}
                  <span className="font-mono text-xs text-text-tertiary">{f.key}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="neutral" size="sm">{f.type}</Badge>
                  <span className="tabular-nums text-text-secondary">
                    {f.type === 'LIMIT' ? (f.value === '-1' ? 'Unlimited' : f.value) : (f.value === 'true' ? 'On' : 'Off')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    { id: 'features', label: 'Features', content: featuresContent },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Subscriptions', href: `/tenant/${tenantId}/admin/subscriptions` },
        { label: planName },
      ]} />

      <PageHeader
        title={planName}
        subtitle={`${intervalLabel(sub.billingInterval)} · ${formatPrice(price, currency)}`}
        badge={<SubscriptionStatusBadge status={sub.status} />}
        actions={availableActions}
      />

      <TabGroup tabs={tabs} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{label}</p>
      <div className="text-text-primary">{children}</div>
    </div>
  );
}
