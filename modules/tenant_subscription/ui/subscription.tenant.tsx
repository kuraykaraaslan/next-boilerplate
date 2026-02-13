'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsTabProps } from '@/modules/setting/setting.types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCheck,
  faTimes,
  faInfinity,
  faExchangeAlt,
} from '@fortawesome/free-solid-svg-icons';
import DynamicSelect from '@/components/common/forms/DynamicSelect';
import type { TenantSubscriptionWithPlan, PlanWithFeatures } from '../tenant_subscription.types';

export default function SubscriptionTenantTab({ settings, setSettings, loading, saving, tenantId }: SettingsTabProps & { tenantId?: string }) {
  const [subscription, setSubscription] = useState<TenantSubscriptionWithPlan | null>(null);
  const [plans, setPlans] = useState<PlanWithFeatures[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedInterval, setSelectedInterval] = useState('MONTHLY');
  const [assigning, setAssigning] = useState(false);

  const apiBase = tenantId ? `/tenant/${tenantId}/api` : '';

  const fetchData = useCallback(async () => {
    try {
      setDataLoading(true);
      const [subRes, plansRes] = await Promise.all([
        fetch(`${apiBase}/subscription`),
        fetch('/system/api/subscriptions/plans?includeFeatures=true'),
      ]);

      const subData = await subRes.json();
      const plansData = await plansRes.json();

      if (subData.success && subData.subscription) {
        setSubscription(subData.subscription);
      }
      if (plansData.success) {
        setPlans(plansData.plans.filter((p: PlanWithFeatures) => p.status === 'ACTIVE'));
      }
    } catch {
      // silently fail
    } finally {
      setDataLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assignPlan = async () => {
    if (!selectedPlanId) return;
    setAssigning(true);
    try {
      const res = await fetch(`${apiBase}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          billingInterval: selectedInterval,
        }),
      });

      if (res.ok) {
        setChangingPlan(false);
        fetchData();
      }
    } finally {
      setAssigning(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex justify-center p-8">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl" />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'badge-success',
      TRIALING: 'badge-info',
      PAST_DUE: 'badge-warning',
      CANCELLED: 'badge-error',
      EXPIRED: 'badge-ghost',
    };
    return map[status] || 'badge-ghost';
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="card-title text-lg">Current Subscription</h3>
              <p className="text-sm text-base-content/60">Your current plan and billing details</p>
            </div>
            {subscription && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSelectedPlanId(subscription.planId);
                  setSelectedInterval(subscription.billingInterval);
                  setChangingPlan(true);
                }}
              >
                <FontAwesomeIcon icon={faExchangeAlt} className="mr-1" />
                Change Plan
              </button>
            )}
          </div>

          {subscription ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title text-xs">Plan</div>
                <div className="stat-value text-lg">{subscription.plan.name}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title text-xs">Status</div>
                <div className="stat-value text-lg">
                  <span className={`badge ${statusBadge(subscription.status)}`}>
                    {subscription.status}
                  </span>
                </div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title text-xs">Billing</div>
                <div className="stat-value text-lg">
                  {subscription.billingInterval === 'MONTHLY'
                    ? `${subscription.plan.currency} ${subscription.plan.monthlyPrice}/mo`
                    : `${subscription.plan.currency} ${subscription.plan.yearlyPrice}/yr`}
                </div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title text-xs">Period End</div>
                <div className="stat-value text-lg text-sm">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-base-content/50 mb-4">No active subscription</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setChangingPlan(true)}
              >
                Select a Plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Plan Features */}
      {subscription && subscription.plan.features.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-lg">Plan Features</h3>
            <p className="text-sm text-base-content/60 mb-4">Features included in your current plan</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {subscription.plan.features.map(feature => (
                <div key={feature.featureId} className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
                  {feature.type === 'BOOLEAN' ? (
                    <FontAwesomeIcon
                      icon={feature.value === 'true' ? faCheck : faTimes}
                      className={feature.value === 'true' ? 'text-success' : 'text-error'}
                    />
                  ) : (
                    <span className="font-bold text-primary min-w-[3rem] text-center">
                      {feature.value === '-1' ? (
                        <FontAwesomeIcon icon={faInfinity} />
                      ) : (
                        feature.value
                      )}
                    </span>
                  )}
                  <span className="text-sm">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {changingPlan && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">
              {subscription ? 'Change Plan' : 'Select a Plan'}
            </h3>
            <div className="space-y-3">
              <DynamicSelect
                label="Plan"
                selectedValue={selectedPlanId}
                onValueChange={v => setSelectedPlanId(v)}
                options={plans.map(p => ({
                  value: p.planId,
                  label: `${p.name} - ${p.currency} ${p.monthlyPrice}/mo`,
                }))}
                disabled={assigning}
              />
              <DynamicSelect
                label="Billing Interval"
                selectedValue={selectedInterval}
                onValueChange={v => setSelectedInterval(v)}
                options={[
                  { value: 'MONTHLY', label: 'Monthly' },
                  { value: 'YEARLY', label: 'Yearly' },
                ]}
                disabled={assigning}
              />

              {/* Selected plan preview */}
              {selectedPlanId && (() => {
                const plan = plans.find(p => p.planId === selectedPlanId);
                if (!plan) return null;
                return (
                  <div className="bg-base-200 rounded-lg p-4">
                    <div className="text-sm font-medium mb-2">
                      {plan.name} - {selectedInterval === 'MONTHLY'
                        ? `${plan.currency} ${plan.monthlyPrice}/mo`
                        : `${plan.currency} ${plan.yearlyPrice}/yr`}
                    </div>
                    {plan.features.length > 0 && (
                      <ul className="text-xs space-y-1">
                        {plan.features.map(f => (
                          <li key={f.featureId} className="flex items-center gap-2">
                            {f.type === 'BOOLEAN' ? (
                              <FontAwesomeIcon
                                icon={f.value === 'true' ? faCheck : faTimes}
                                className={`text-xs ${f.value === 'true' ? 'text-success' : 'text-error'}`}
                              />
                            ) : (
                              <span className="font-bold text-primary">
                                {f.value === '-1' ? 'Unlimited' : f.value}
                              </span>
                            )}
                            {f.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setChangingPlan(false)} disabled={assigning}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={assignPlan} disabled={assigning || !selectedPlanId}>
                {assigning ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setChangingPlan(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
