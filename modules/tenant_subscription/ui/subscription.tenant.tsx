'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsTabProps } from '@/modules/setting/setting.types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCheck,
  faTimes,
  faInfinity,
  faCrown,
  faBan,
} from '@fortawesome/free-solid-svg-icons';
import type { TenantSubscriptionWithPlan, PlanWithFeatures } from '../tenant_subscription.types';

export default function SubscriptionTenantTab({ settings, setSettings, loading, saving, tenantId }: SettingsTabProps & { tenantId?: string }) {
  const [subscription, setSubscription] = useState<TenantSubscriptionWithPlan | null>(null);
  const [plans, setPlans] = useState<PlanWithFeatures[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = tenantId ? `/tenant/${tenantId}/api` : '';

  const fetchData = useCallback(async () => {
    try {
      setDataLoading(true);
      const [subRes, plansRes] = await Promise.all([
        fetch(`${apiBase}/subscription`),
        fetch('/system/api/subscriptions/plans/public'),
      ]);

      const subData = await subRes.json();
      const plansData = await plansRes.json();

      if (subData.success && subData.subscription) {
        setSubscription(subData.subscription);
        setBillingInterval(subData.subscription.billingInterval);
      }
      if (plansData.success) {
        setPlans(plansData.plans);
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

  // Subscribe / Change plan
  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingInterval }),
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        setError(data.message || 'Failed to subscribe');
      }
    } catch {
      setError('Failed to subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  // Cancel subscription
  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/subscription`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setShowCancelConfirm(false);
        fetchData();
      } else {
        setError(data.message || 'Failed to cancel subscription');
      }
    } catch {
      setError('Failed to cancel subscription');
    } finally {
      setCancelling(false);
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

  const getPriceLabel = (plan: PlanWithFeatures) =>
    billingInterval === 'MONTHLY'
      ? `${plan.currency} ${plan.monthlyPrice}`
      : `${plan.currency} ${plan.yearlyPrice}`;

  const isCurrentPlan = (planId: string) =>
    subscription?.planId === planId && subscription?.status !== 'CANCELLED' && subscription?.status !== 'EXPIRED';

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setError(null)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}

      {/* Current Subscription Info */}
      {subscription && subscription.status !== 'CANCELLED' && subscription.status !== 'EXPIRED' && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="card-title text-lg">
                  <FontAwesomeIcon icon={faCrown} className="text-warning mr-2" />
                  Current Plan: {subscription.plan.name}
                </h3>
                <p className="text-sm text-base-content/60 mt-1">
                  <span className={`badge ${statusBadge(subscription.status)} mr-2`}>
                    {subscription.status}
                  </span>
                  {subscription.billingInterval === 'MONTHLY' ? 'Monthly' : 'Yearly'} billing
                  &middot; Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  {subscription.trialEndsAt && (
                    <> &middot; Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <button
                className="btn btn-error btn-outline btn-sm"
                onClick={() => setShowCancelConfirm(true)}
              >
                <FontAwesomeIcon icon={faBan} className="mr-1" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <div className="join">
          <button
            className={`join-item btn btn-sm ${billingInterval === 'MONTHLY' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setBillingInterval('MONTHLY')}
          >
            Monthly
          </button>
          <button
            className={`join-item btn btn-sm ${billingInterval === 'YEARLY' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setBillingInterval('YEARLY')}
          >
            Yearly
            {plans.length > 0 && plans.some(p => Number(p.yearlyPrice) < Number(p.monthlyPrice) * 12) && (
              <span className="badge badge-success badge-xs ml-1">Save</span>
            )}
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      {plans.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">
          No plans available at the moment.
        </div>
      ) : (
        <div className={`grid gap-6 ${plans.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : plans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {plans.map(plan => {
            const current = isCurrentPlan(plan.planId);
            const isSubscribing = subscribing === plan.planId;

            return (
              <div
                key={plan.planId}
                className={`card bg-base-100 shadow-lg border-2 transition-all ${
                  current
                    ? 'border-primary ring-2 ring-primary/20'
                    : plan.isDefault
                      ? 'border-primary/50'
                      : 'border-base-300 hover:border-primary/30'
                }`}
              >
                <div className="card-body">
                  {/* Plan Header */}
                  <div className="text-center mb-4">
                    {(current || plan.isDefault) && (
                      <span className={`badge ${current ? 'badge-primary' : 'badge-outline badge-primary'} badge-sm mb-2`}>
                        {current ? 'Current Plan' : 'Popular'}
                      </span>
                    )}
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-base-content/60 mt-1">{plan.description}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">
                        {getPriceLabel(plan)}
                      </span>
                      <span className="text-base-content/50 text-sm">
                        /{billingInterval === 'MONTHLY' ? 'mo' : 'yr'}
                      </span>
                    </div>
                    {billingInterval === 'YEARLY' && Number(plan.yearlyPrice) < Number(plan.monthlyPrice) * 12 && (
                      <p className="text-xs text-success mt-1">
                        Save {plan.currency} {(Number(plan.monthlyPrice) * 12 - Number(plan.yearlyPrice)).toFixed(2)}/yr
                      </p>
                    )}
                    {plan.trialDays > 0 && !subscription && (
                      <p className="text-xs text-info mt-1">{plan.trialDays} day free trial</p>
                    )}
                  </div>

                  {/* Features */}
                  {plan.features.length > 0 && (
                    <div className="flex-1 mb-6">
                      <ul className="space-y-2">
                        {plan.features.map(feature => (
                          <li key={feature.featureId} className="flex items-center gap-2 text-sm">
                            {feature.type === 'BOOLEAN' ? (
                              <>
                                <FontAwesomeIcon
                                  icon={feature.value === 'true' ? faCheck : faTimes}
                                  className={`w-4 ${feature.value === 'true' ? 'text-success' : 'text-base-content/30'}`}
                                />
                                <span className={feature.value !== 'true' ? 'text-base-content/40 line-through' : ''}>
                                  {feature.label}
                                </span>
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faCheck} className="w-4 text-success" />
                                <span>
                                  {feature.value === '-1' ? (
                                    <><FontAwesomeIcon icon={faInfinity} className="text-primary mx-1" /> {feature.label}</>
                                  ) : (
                                    <><strong className="text-primary">{feature.value}</strong> {feature.label}</>
                                  )}
                                </span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="card-actions justify-center mt-auto">
                    {current ? (
                      <button className="btn btn-primary btn-block" disabled>
                        <FontAwesomeIcon icon={faCheck} className="mr-1" />
                        Current Plan
                      </button>
                    ) : (
                      <button
                        className={`btn btn-block ${plan.isDefault ? 'btn-primary' : 'btn-outline btn-primary'}`}
                        onClick={() => handleSubscribe(plan.planId)}
                        disabled={isSubscribing || subscribing !== null}
                      >
                        {isSubscribing ? (
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        ) : subscription && subscription.status !== 'CANCELLED' && subscription.status !== 'EXPIRED' ? (
                          'Switch to This Plan'
                        ) : plan.trialDays > 0 ? (
                          'Start Free Trial'
                        ) : (
                          'Subscribe'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg mb-2">Cancel Subscription</h3>
            <p className="text-base-content/70 mb-1">
              Are you sure you want to cancel your subscription?
            </p>
            <p className="text-sm text-base-content/50 mb-4">
              You will lose access to your current plan features at the end of the billing period.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
              >
                Keep Plan
              </button>
              <button
                className="btn btn-error"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowCancelConfirm(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
