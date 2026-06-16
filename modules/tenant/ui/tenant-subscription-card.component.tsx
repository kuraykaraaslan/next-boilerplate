'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@nb/common/ui/button.component';
import { Badge } from '@nb/common/ui/badge.component';
import { Input } from '@nb/common/ui/input.component';
import { Card } from '@nb/common/ui/card.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import { Modal } from '@nb/common/ui/modal.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard } from '@fortawesome/free-solid-svg-icons';
import api from '@nb/common/server/axios';

type PlatformPlan = {
  planId: string;
  interval: string;
  product: { name: string; basePrice: number; currency: string };
};

type Subscription = {
  status: string;
  billingInterval: string;
  currentPeriodEnd: string | null;
  plan?: { product?: { name?: string | null } | null } | null;
} | null;

const selectClass =
  'h-9 rounded-lg border border-border bg-surface-base px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus w-full';

export function TenantSubscriptionCard({
  tenantId,
  targetTenantId,
}: {
  tenantId: string;
  targetTenantId: string;
}) {
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [platformPlans, setPlatformPlans] = useState<PlatformPlan[]>([]);

  const [showPlan, setShowPlan] = useState(false);
  const [planValues, setPlanValues] = useState({ planId: '', billingInterval: '', priceOverride: '' });
  const [assigning, setAssigning] = useState(false);
  const [planError, setPlanError] = useState('');

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await api.get(`/tenant/${tenantId}/api/tenants/${targetTenantId}/subscription`);
      setSubscription(res.data.subscription ?? null);
      setPlatformPlans(res.data.platformPlans ?? []);
    } catch {
      // silent — subscription panel is secondary
    }
  }, [tenantId, targetTenantId]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  function openPlan() {
    setPlanValues({ planId: platformPlans[0]?.planId ?? '', billingInterval: '', priceOverride: '' });
    setPlanError('');
    setShowPlan(true);
  }

  async function handleAssignPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!planValues.planId) { setPlanError('Select a plan.'); return; }
    setAssigning(true); setPlanError('');
    try {
      await api.post(`/tenant/${tenantId}/api/tenants/${targetTenantId}/subscription`, {
        planId: planValues.planId,
        ...(planValues.billingInterval ? { billingInterval: planValues.billingInterval } : {}),
        ...(planValues.priceOverride !== '' ? { priceOverride: Number(planValues.priceOverride) } : {}),
      });
      setShowPlan(false);
      fetchSubscription();
    } catch (err: any) {
      setPlanError(err.response?.data?.message ?? err.message ?? 'Failed to assign plan.');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <>
      <Card title="Subscription Plan">
        <div className="space-y-3">
          <dl className="text-sm space-y-1">
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Current plan</dt>
              <dd className="text-text-primary font-medium">{subscription?.plan?.product?.name ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Status</dt>
              <dd>
                {subscription
                  ? <Badge variant={subscription.status === 'ACTIVE' || subscription.status === 'TRIALING' ? 'success' : 'warning'} dot>{subscription.status}</Badge>
                  : <Badge variant="neutral">No subscription</Badge>}
              </dd>
            </div>
          </dl>
          <Button
            variant="outline"
            fullWidth
            iconLeft={<FontAwesomeIcon icon={faCreditCard} />}
            onClick={openPlan}
          >
            Change Plan (Free)
          </Button>
        </div>
      </Card>

      <Modal
        open={showPlan}
        onClose={() => setShowPlan(false)}
        title="Change Plan (Free)"
        description="Assign a platform plan to this tenant with no payment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPlan(false)} disabled={assigning}>Cancel</Button>
            <Button form="assign-plan-form" type="submit" loading={assigning} disabled={platformPlans.length === 0}>Assign</Button>
          </>
        }
      >
        <form id="assign-plan-form" onSubmit={handleAssignPlan} className="space-y-4">
          {planError && <AlertBanner variant="error" message={planError} />}
          {platformPlans.length === 0 && (
            <AlertBanner variant="warning" message="No active platform plans found. Create one in the Platform tenant's Plans page first." />
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor="plan-id" className="text-xs font-medium text-text-secondary">Platform Plan</label>
            <select
              id="plan-id"
              value={planValues.planId}
              onChange={(e) => setPlanValues((v) => ({ ...v, planId: e.target.value }))}
              className={selectClass}
            >
              {platformPlans.map((p) => (
                <option key={p.planId} value={p.planId}>
                  {p.product.name} — {p.product.basePrice} {p.product.currency} / {p.interval}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="plan-interval" className="text-xs font-medium text-text-secondary">Billing Interval (optional)</label>
            <select
              id="plan-interval"
              value={planValues.billingInterval}
              onChange={(e) => setPlanValues((v) => ({ ...v, billingInterval: e.target.value }))}
              className={selectClass}
            >
              <option value="">Use plan default</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          <Input
            id="plan-price"
            label="Custom price (optional)"
            type="number"
            min={0}
            placeholder="Empty = free / copy plan price"
            value={planValues.priceOverride}
            onChange={(e) => setPlanValues((v) => ({ ...v, priceOverride: e.target.value }))}
          />
        </form>
      </Modal>
    </>
  );
}
