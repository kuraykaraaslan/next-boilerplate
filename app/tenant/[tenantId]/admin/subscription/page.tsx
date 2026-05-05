'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/libs/axios';
import { PageHeader } from '@/modules/ui/PageHeader';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Card } from '@/modules/ui/Card';
import { Button } from '@/modules/ui/Button';
import { Badge } from '@/modules/ui/Badge';
import { Modal } from '@/modules/ui/Modal';
import { RadioGroup } from '@/modules/ui/RadioGroup';
import { SubscriptionPlanCard } from '@/modules/tenant_subscription/ui/subscription.plan-card';
import { GracePeriodBanner } from '@/modules/tenant_subscription/ui/subscription.grace-banner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCreditCard, faWarning, faCalendar, faFlask,
  faCheckCircle, faClock, faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { faStripe, faPaypal } from '@fortawesome/free-brands-svg-icons';
import type { BillingInterval } from '@/modules/tenant_subscription/tenant_subscription.enums';
import type {
  PlanWithFeatures,
  TenantSubscriptionWithPlan,
  GracePeriodStatus,
} from '@/modules/tenant_subscription/tenant_subscription.types';

// ─── Local types ──────────────────────────────────────────────────────────────

type Provider = 'STRIPE' | 'PAYPAL' | 'IYZICO';

const PROVIDER_OPTIONS = [
  {
    value: 'STRIPE' as Provider,
    label: 'Stripe',
    icon: <FontAwesomeIcon icon={faStripe} className="h-4 w-4 text-[#635BFF]" />,
    hint: 'Credit / debit card, Apple Pay, Google Pay',
  },
  {
    value: 'PAYPAL' as Provider,
    label: 'PayPal',
    icon: <FontAwesomeIcon icon={faPaypal} className="h-4 w-4 text-[#003087]" />,
    hint: 'PayPal balance or linked bank account',
  },
  {
    value: 'IYZICO' as Provider,
    label: 'iyzico',
    icon: <span className="text-sm font-bold text-[#2EC4B6]">iy</span>,
    hint: 'Turkish credit / debit card',
  },
];

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE:    'success',
  TRIALING:  'neutral',
  PAST_DUE:  'warning',
  EXPIRED:   'error',
  CANCELLED: 'neutral',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPrice(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CurrentSubscriptionCard({
  subscription,
  onCancel,
}: {
  subscription: TenantSubscriptionWithPlan;
  onCancel: () => void;
}) {
  const { plan, status, billingInterval, currentPeriodEnd, trialEndsAt, cancelledAt } = subscription;
  const price = billingInterval === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: plan info */}
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-text-primary">{plan.name}</h3>
            <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} dot size="sm">
              {status === 'TRIALING' ? 'Trial' : status.charAt(0) + status.slice(1).toLowerCase()}
            </Badge>
            <Badge variant="neutral" size="sm">
              {billingInterval === 'YEARLY' ? 'Annual' : 'Monthly'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {status !== 'CANCELLED' && currentPeriodEnd && (
              <div className="flex items-center gap-2 text-text-secondary">
                <FontAwesomeIcon icon={faCalendar} className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {status === 'ACTIVE' ? 'Renews' : 'Access until'}{' '}
                  <span className="text-text-primary font-medium">{formatDate(currentPeriodEnd)}</span>
                </span>
              </div>
            )}
            {status === 'TRIALING' && trialEndsAt && (
              <div className="flex items-center gap-2 text-text-secondary">
                <FontAwesomeIcon icon={faFlask} className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Trial ends{' '}
                  <span className="text-text-primary font-medium">{formatDate(trialEndsAt)}</span>
                </span>
              </div>
            )}
            {status === 'CANCELLED' && cancelledAt && (
              <div className="flex items-center gap-2 text-text-secondary">
                <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Cancelled on{' '}
                  <span className="text-text-primary font-medium">{formatDate(cancelledAt)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Feature list — condensed */}
          {plan.features && plan.features.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
              {plan.features.slice(0, 6).map((f) => (
                <li key={f.featureId} className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-success" />
                  {f.label}
                  {f.value && f.value !== 'true' && f.type === 'LIMIT' && (
                    <span className="text-text-tertiary">
                      {f.value === '-1' ? ' (unlimited)' : ` (${f.value})`}
                    </span>
                  )}
                </li>
              ))}
              {plan.features.length > 6 && (
                <li className="text-text-tertiary">+{plan.features.length - 6} more</li>
              )}
            </ul>
          )}
        </div>

        {/* Right: price + cancel */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 shrink-0">
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {formatPrice(price, plan.currency)}
            <span className="text-sm font-normal text-text-secondary ml-1">
              /{billingInterval === 'YEARLY' ? 'yr' : 'mo'}
            </span>
          </p>
          {status !== 'CANCELLED' && status !== 'EXPIRED' && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel Plan
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantSubscriptionPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Data state ──
  const [plans, setPlans] = useState<PlanWithFeatures[]>([]);
  const [subscription, setSubscription] = useState<TenantSubscriptionWithPlan | null>(null);
  const [gracePeriod, setGracePeriod] = useState<GracePeriodStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // ── UI state ──
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('MONTHLY');
  const [provider, setProvider] = useState<Provider>('STRIPE');
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // ── Feedback ──
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── URL param handling ──
  const paymentSuccess = searchParams.get('paymentSuccess') === 'true';
  const paymentCancelled = searchParams.get('paymentCancelled') === 'true';
  const paymentId = searchParams.get('paymentId');

  const clearUrlParams = useCallback(() => {
    router.replace(`/tenant/${tenantId}/admin/subscription`);
  }, [router, tenantId]);

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, subRes, graceRes] = await Promise.allSettled([
        api.get('/system/api/subscriptions/plans/public'),
        api.get<{ subscription: TenantSubscriptionWithPlan | null }>(`/tenant/${tenantId}/api/subscription`),
        api.get<{ status: GracePeriodStatus }>(`/tenant/${tenantId}/api/subscription/grace-period`),
      ]);

      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data.plans ?? []);
      if (subRes.status === 'fulfilled') {
        const sub = subRes.value.data.subscription ?? null;
        setSubscription(sub);
        if (sub) setBillingInterval(sub.billingInterval);
      }
      if (graceRes.status === 'fulfilled') setGracePeriod(graceRes.value.data.status ?? null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Auto-confirm payment on return from provider ──
  useEffect(() => {
    if (!paymentSuccess || !paymentId) return;

    (async () => {
      setConfirming(true);
      setError('');
      try {
        await api.post(`/tenant/${tenantId}/api/subscription/confirm`, { paymentId });
        await fetchData();
        setSuccess('Subscription activated successfully!');
      } catch (e: any) {
        setError(e.response?.data?.message ?? 'Payment confirmation failed. Please contact support.');
      } finally {
        setConfirming(false);
        clearUrlParams();
      }
    })();
  }, [paymentSuccess, paymentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!paymentCancelled) return;
    setError('Payment was cancelled. You can try again below.');
    clearUrlParams();
  }, [paymentCancelled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──
  async function handleSelectPlan(planId: string) {
    setSelecting(planId);
    setError('');
    try {
      const res = await api.post<{ checkoutUrl: string }>(`/tenant/${tenantId}/api/subscription`, {
        planId,
        billingInterval,
        provider,
      });
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to initiate payment. Please try again.');
      setSelecting(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await api.delete(`/tenant/${tenantId}/api/subscription`);
      await fetchData();
      setShowCancel(false);
      setSuccess('Subscription cancelled. Access continues until the end of the billing period.');
      setTimeout(() => setSuccess(''), 6000);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary">Confirming your payment…</p>
      </div>
    );
  }

  const activeSubscription =
    subscription && subscription.status !== 'CANCELLED' && subscription.status !== 'EXPIRED'
      ? subscription
      : null;

  const yearlyMonthlyRatio =
    plans.length > 0 && plans[0].monthlyPrice > 0
      ? Math.round((1 - plans[0].yearlyPrice / (plans[0].monthlyPrice * 12)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription"
        subtitle="Manage your organization's plan and billing"
      />

      {/* Grace period banner */}
      {gracePeriod?.inGrace && (
        <GracePeriodBanner status={gracePeriod} tenantId={tenantId} />
      )}

      {/* Alerts */}
      {error && <AlertBanner variant="error" message={error} dismissible />}
      {success && <AlertBanner variant="success" message={success} dismissible />}

      {/* Expired / cancelled notice */}
      {subscription && (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') && (
        <AlertBanner
          variant="warning"
          message={
            subscription.status === 'EXPIRED'
              ? 'Your subscription has expired. Choose a plan below to restore access.'
              : 'Your subscription is cancelled. Choose a plan below to resubscribe.'
          }
        />
      )}

      {/* Current plan */}
      {activeSubscription && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Current Plan
          </h2>
          <CurrentSubscriptionCard
            subscription={activeSubscription}
            onCancel={() => setShowCancel(true)}
          />
        </div>
      )}

      {/* Available plans */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <FontAwesomeIcon icon={faCreditCard} className="w-3.5 h-3.5" />
            Available Plans
          </h2>

          {/* Billing interval toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-raised p-1">
            <button
              type="button"
              onClick={() => setBillingInterval('MONTHLY')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                billingInterval === 'MONTHLY'
                  ? 'bg-surface-base text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('YEARLY')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                billingInterval === 'YEARLY'
                  ? 'bg-surface-base text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Yearly
              {yearlyMonthlyRatio > 0 && (
                <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                  -{yearlyMonthlyRatio}%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plan grid */}
        {plans.length === 0 ? (
          <Card>
            <p className="py-4 text-center text-sm text-text-secondary">No plans available.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <SubscriptionPlanCard
                key={plan.planId}
                plan={plan}
                billingInterval={billingInterval}
                current={activeSubscription?.planId === plan.planId}
                onSelect={handleSelectPlan}
                loading={selecting === plan.planId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment provider */}
      {plans.length > 0 && (
        <Card title="Payment Provider">
          <RadioGroup
            name="payment-provider"
            legend="Choose how to pay"
            options={PROVIDER_OPTIONS}
            value={provider}
            onChange={(v) => setProvider(v as Provider)}
            variant="card"
            columns={3}
          />
          <p className="mt-3 text-xs text-text-secondary">
            You'll be redirected to the provider to complete the payment. You can switch providers at any time.
          </p>
        </Card>
      )}

      {/* Resubscribe CTA for expired/cancelled */}
      {subscription && (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
              <FontAwesomeIcon icon={faRotateRight} className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                Reactivate {subscription.plan.name}
              </p>
              <p className="text-xs text-text-secondary">
                Pick any plan above and select a provider to resubscribe.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Cancel modal */}
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your plan? Access continues until the end of the current billing period. You can resubscribe at any time."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancel(false)} disabled={cancelling}>
              Keep Plan
            </Button>
            <Button
              variant="danger"
              loading={cancelling}
              onClick={handleCancel}
              iconLeft={<FontAwesomeIcon icon={faWarning} />}
            >
              Cancel Plan
            </Button>
          </>
        }
      />
    </div>
  );
}
