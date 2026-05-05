'use client';
import { use, useEffect, useState } from 'react';
import api from '@/libs/axios';
import { PageHeader } from '@/modules/ui/PageHeader';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Card } from '@/modules/ui/Card';
import { Button } from '@/modules/ui/Button';
import { Badge } from '@/modules/ui/Badge';
import { Modal } from '@/modules/ui/Modal';
import { SubscriptionPlanCard } from '@/modules/tenant_subscription/ui/subscription.plan-card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faWarning } from '@fortawesome/free-solid-svg-icons';

type Plan = {
  planId: string;
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  billingPeriod?: string | null;
  features?: { featureId: string; key: string; name?: string; value?: string | null }[];
};

type Subscription = {
  tenantSubscriptionId?: string;
  planId: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  plan?: Plan;
};

export default function TenantSubscriptionPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [plans, setPlans]               = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const [selecting, setSelecting]       = useState<string | null>(null);
  const [showCancel, setShowCancel]     = useState(false);
  const [cancelling, setCancelling]     = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/system/api/subscriptions/plans').catch(() => ({ data: { plans: [] } })),
      api.get(`/tenant/${tenantId}/api/subscription`).catch(() => ({ data: null })),
    ])
      .then(([plansRes, subRes]) => {
        setPlans(plansRes.data.plans ?? []);
        setSubscription(subRes.data?.subscription ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function handleSelectPlan(planId: string) {
    setSelecting(planId);
    setError('');
    try {
      await api.post(`/tenant/${tenantId}/api/subscription`, { planId });
      const res = await api.get(`/tenant/${tenantId}/api/subscription`);
      setSubscription(res.data.subscription ?? null);
      setSuccess('Subscription updated.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to update subscription.');
    } finally {
      setSelecting(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await api.delete(`/tenant/${tenantId}/api/subscription`);
      setSubscription(null);
      setShowCancel(false);
      setSuccess('Subscription cancelled.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const subStatusVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    ACTIVE: 'success', CANCELLED: 'neutral', EXPIRED: 'warning', SUSPENDED: 'error',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription"
        subtitle="Manage your organization plan"
        actions={subscription ? [{ label: 'Cancel Plan', variant: 'outline', onClick: () => setShowCancel(true) }] : []}
      />

      {error   && <AlertBanner variant="error"   message={error}   dismissible />}
      {success && <AlertBanner variant="success" message={success} dismissible />}

      {/* Current subscription */}
      {subscription && (
        <Card title="Current Subscription">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-base font-semibold text-text-primary">
                {subscription.plan?.name ?? subscription.planId}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={subStatusVariant[subscription.status] ?? 'neutral'} dot>
                  {subscription.status}
                </Badge>
                {subscription.endDate && (
                  <span className="text-xs text-text-secondary">
                    Renews {new Date(subscription.endDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {subscription.plan && (
              <p className="text-2xl font-bold tabular-nums text-text-primary">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: subscription.plan.currency ?? 'USD',
                  minimumFractionDigits: 0,
                }).format(subscription.plan.price)}
                {subscription.plan.billingPeriod && (
                  <span className="text-sm font-normal text-text-secondary ml-1">
                    /{subscription.plan.billingPeriod.toLowerCase()}
                  </span>
                )}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Plan selection */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faCreditCard} className="w-3.5 h-3.5" />
          Available Plans
        </h2>
        {plans.length === 0 ? (
          <Card>
            <p className="text-sm text-text-secondary py-4 text-center">No plans available.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <SubscriptionPlanCard
                key={plan.planId}
                plan={plan}
                current={subscription?.planId === plan.planId}
                onSelect={handleSelectPlan}
                loading={selecting === plan.planId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel confirm */}
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your current plan? Access will continue until the end of the billing period."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancel(false)} disabled={cancelling}>Keep Plan</Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}
              iconLeft={<FontAwesomeIcon icon={faWarning} />}>
              Cancel Plan
            </Button>
          </>
        }
      />
    </div>
  );
}
