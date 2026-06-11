'use client';
import { use, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/modules_next/common/axios';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Card } from '@/modules_next/common/ui/Card';
import { Button } from '@/modules_next/common/ui/Button';
import { Modal } from '@/modules_next/common/ui/Modal';
import { SubscriptionPlanCard } from '@/modules_next/tenant_subscription/ui/SubscriptionPlanCard';
import { GracePeriodBanner } from '@/modules_next/tenant_subscription/ui/GracePeriodBanner';
import { CurrentSubscriptionCard } from '@/modules_next/tenant_subscription/ui/CurrentSubscriptionCard';
import { CardCheckoutModal } from '@/modules_next/payment/ui/CardCheckoutModal';
import { StripeExpressCheckoutModal } from '@/modules_next/payment/ui/StripeExpressCheckoutModal';
import { PaymentProviderSelector } from '@/modules_next/payment/ui/PaymentProviderSelector';
import type { WalletMethod } from '@/modules/payment/payment.enums';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faWarning, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import type {
  PlanWithFeatures,
  TenantSubscriptionWithPlan,
  GracePeriodStatus,
} from '@/modules/tenant_subscription/tenant_subscription.types';
import type { Provider } from '@/modules_next/tenant_subscription/ui/subscription.helpers';

export default function TenantSubscriptionPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans]               = useState<PlanWithFeatures[]>([]);
  const [subscription, setSubscription] = useState<TenantSubscriptionWithPlan | null>(null);
  const [gracePeriod, setGracePeriod]   = useState<GracePeriodStatus | null>(null);
  const [loading, setLoading]           = useState(true);

  const [provider, setProvider]       = useState<Provider>('STRIPE');
  const [iyzicoMode, setIyzicoMode]   = useState<'card' | 'wallet'>('card');
  const [stripeMode, setStripeMode]   = useState<'hosted' | 'express'>('hosted');
  const [selecting, setSelecting]     = useState<string | null>(null);
  const [cardPlan, setCardPlan]       = useState<{ planId: string; name: string; basePrice: number; currency: string } | null>(null);
  const [expressPlan, setExpressPlan] = useState<{ planId: string; name: string } | null>(null);
  const [walletMatrix, setWalletMatrix] = useState<Record<string, WalletMethod[]>>({});
  const [showCancel, setShowCancel]   = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const [confirming, setConfirming]   = useState(false);

  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const paymentSuccess   = searchParams.get('paymentSuccess') === 'true';
  const paymentCancelled = searchParams.get('paymentCancelled') === 'true';
  const paymentId        = searchParams.get('paymentId');

  const clearUrlParams = useCallback(() => {
    router.replace(`/tenant/${tenantId}/admin/subscription`);
  }, [router, tenantId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, subRes, graceRes] = await Promise.allSettled([
        api.get(`/tenant/${tenantId}/api/plans/public`),
        api.get<{ subscription: TenantSubscriptionWithPlan | null }>(`/tenant/${tenantId}/api/subscription`),
        api.get<{ status: GracePeriodStatus }>(`/tenant/${tenantId}/api/subscription/grace-period`),
      ]);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data.plans ?? []);
      if (subRes.status === 'fulfilled')   setSubscription(subRes.value.data.subscription ?? null);
      if (graceRes.status === 'fulfilled') setGracePeriod(graceRes.value.data.status ?? null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ matrix: { provider: string; wallets: { method: WalletMethod }[] }[] }>(
          `/tenant/${tenantId}/api/payments/wallets`,
        );
        const map: Record<string, WalletMethod[]> = {};
        for (const row of res.data.matrix ?? []) map[row.provider] = row.wallets.map((w) => w.method);
        setWalletMatrix(map);
      } catch { /* non-critical */ }
    })();
  }, [tenantId]);

  useEffect(() => {
    if (!paymentSuccess || !paymentId) return;
    (async () => {
      setConfirming(true); setError('');
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

  async function handleSelectPlan(planId: string) {
    setError('');
    if (provider === 'IYZICO' && iyzicoMode === 'card') {
      const p = plans.find((pl) => pl.planId === planId);
      if (!p?.product) { setError('This plan is not available for purchase.'); return; }
      setCardPlan({ planId, name: p.product.name, basePrice: Number(p.product.basePrice), currency: p.product.currency });
      return;
    }
    if (provider === 'STRIPE' && stripeMode === 'express') {
      const p = plans.find((pl) => pl.planId === planId);
      if (!p?.product) { setError('This plan is not available for purchase.'); return; }
      setExpressPlan({ planId, name: p.product.name });
      return;
    }
    setSelecting(planId);
    try {
      const res = await api.post<{ checkoutUrl: string }>(`/tenant/${tenantId}/api/subscription`, {
        planId,
        provider,
        ...(provider === 'IYZICO' && iyzicoMode === 'wallet' ? { convertToTry: true } : {}),
      });
      if (res.data.checkoutUrl) window.location.href = res.data.checkoutUrl;
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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

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
      ? subscription : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription" subtitle="Manage your organization's plan and billing" />

      {gracePeriod?.inGrace && <GracePeriodBanner status={gracePeriod} tenantId={tenantId} />}
      {error   && <AlertBanner variant="error"   message={error}   dismissible />}
      {success && <AlertBanner variant="success" message={success} dismissible />}

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

      {activeSubscription && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Current Plan</h2>
          <CurrentSubscriptionCard subscription={activeSubscription} onCancel={() => setShowCancel(true)} />
        </div>
      )}

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          <FontAwesomeIcon icon={faCreditCard} className="w-3.5 h-3.5" />
          Available Plans
        </h2>
        {plans.length === 0 ? (
          <Card><p className="py-4 text-center text-sm text-text-secondary">No plans available.</p></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <SubscriptionPlanCard
                key={plan.planId}
                plan={plan}
                current={activeSubscription?.planId === plan.planId}
                onSelect={handleSelectPlan}
                loading={selecting === plan.planId}
              />
            ))}
          </div>
        )}
      </div>

      {plans.length > 0 && (
        <PaymentProviderSelector
          provider={provider}
          onProviderChange={setProvider}
          iyzicoMode={iyzicoMode}
          onIyzicoModeChange={setIyzicoMode}
          stripeMode={stripeMode}
          onStripeModeChange={setStripeMode}
          walletMatrix={walletMatrix}
        />
      )}

      {subscription && (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
              <FontAwesomeIcon icon={faRotateRight} className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Reactivate {subscription.plan.product?.name ?? 'Plan'}</p>
              <p className="text-xs text-text-secondary">Pick any plan above and select a provider to resubscribe.</p>
            </div>
          </div>
        </Card>
      )}

      <CardCheckoutModal
        open={!!cardPlan}
        onClose={() => setCardPlan(null)}
        tenantId={tenantId}
        plan={cardPlan}
        provider="IYZICO"
        onSuccess={async () => {
          setCardPlan(null);
          await fetchData();
          setSuccess('Subscription activated successfully!');
          setTimeout(() => setSuccess(''), 6000);
        }}
      />

      <StripeExpressCheckoutModal
        open={!!expressPlan}
        onClose={() => setExpressPlan(null)}
        tenantId={tenantId}
        plan={expressPlan}
        onSuccess={async () => {
          setExpressPlan(null);
          await fetchData();
          setSuccess('Subscription activated successfully!');
          setTimeout(() => setSuccess(''), 6000);
        }}
      />

      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your plan? Access continues until the end of the current billing period. You can resubscribe at any time."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancel(false)} disabled={cancelling}>Keep Plan</Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel} iconLeft={<FontAwesomeIcon icon={faWarning} />}>
              Cancel Plan
            </Button>
          </>
        }
      />
    </div>
  );
}
