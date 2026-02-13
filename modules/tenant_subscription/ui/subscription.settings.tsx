'use client';

import { useState, useEffect, useCallback } from 'react';
import DynamicText from '@/components/common/forms/DynamicText';
import DynamicToggle from '@/components/common/forms/DynamicToggle';
import DynamicSelect from '@/components/common/forms/DynamicSelect';
import { SettingsTabProps } from '@/modules/setting/setting.types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrash,
  faSpinner,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import type { PlanWithFeatures, PlanFeature } from '../tenant_subscription.types';

interface PlanFormData {
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  currency: string;
  trialDays: string;
  sortOrder: string;
  isDefault: boolean;
  status: string;
}

interface FeatureFormData {
  key: string;
  label: string;
  type: string;
  value: string;
  sortOrder: string;
}

const defaultPlanForm: PlanFormData = {
  name: '',
  description: '',
  monthlyPrice: '0',
  yearlyPrice: '0',
  currency: 'USD',
  trialDays: '0',
  sortOrder: '0',
  isDefault: false,
  status: 'ACTIVE',
};

const defaultFeatureForm: FeatureFormData = {
  key: '',
  label: '',
  type: 'BOOLEAN',
  value: 'true',
  sortOrder: '0',
};

export default function SubscriptionSettingsTab({ settings, setSettings, loading, saving }: SettingsTabProps) {
  const isDisabled = loading || saving;

  // Plan state
  const [plans, setPlans] = useState<PlanWithFeatures[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Plan modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormData>(defaultPlanForm);
  const [planSaving, setPlanSaving] = useState(false);

  // Feature modal state
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [featureForm, setFeatureForm] = useState<FeatureFormData>(defaultFeatureForm);
  const [featurePlanId, setFeaturePlanId] = useState<string | null>(null);
  const [featureSaving, setFeatureSaving] = useState(false);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      const res = await fetch('/system/api/subscriptions/plans?includeFeatures=true');
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch {
      // silently fail
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Plan CRUD
  const openNewPlan = () => {
    setPlanForm(defaultPlanForm);
    setEditingPlanId(null);
    setShowPlanModal(true);
  };

  const openEditPlan = (plan: PlanWithFeatures) => {
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      monthlyPrice: String(plan.monthlyPrice),
      yearlyPrice: String(plan.yearlyPrice),
      currency: plan.currency,
      trialDays: String(plan.trialDays),
      sortOrder: String(plan.sortOrder),
      isDefault: plan.isDefault,
      status: plan.status,
    });
    setEditingPlanId(plan.planId);
    setShowPlanModal(true);
  };

  const savePlan = async () => {
    setPlanSaving(true);
    try {
      const body = {
        name: planForm.name,
        description: planForm.description || undefined,
        monthlyPrice: Number(planForm.monthlyPrice),
        yearlyPrice: Number(planForm.yearlyPrice),
        currency: planForm.currency,
        trialDays: Number(planForm.trialDays),
        sortOrder: Number(planForm.sortOrder),
        isDefault: planForm.isDefault,
        status: planForm.status,
      };

      const url = editingPlanId
        ? `/system/api/subscriptions/plans/${editingPlanId}`
        : '/system/api/subscriptions/plans';
      const method = editingPlanId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowPlanModal(false);
        fetchPlans();
      }
    } finally {
      setPlanSaving(false);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      const res = await fetch(`/system/api/subscriptions/plans/${planId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPlans();
      }
    } catch {
      // silently fail
    }
  };

  // Feature CRUD
  const openNewFeature = (planId: string) => {
    setFeatureForm(defaultFeatureForm);
    setEditingFeatureId(null);
    setFeaturePlanId(planId);
    setShowFeatureModal(true);
  };

  const openEditFeature = (planId: string, feature: PlanFeature) => {
    setFeatureForm({
      key: feature.key,
      label: feature.label,
      type: feature.type,
      value: feature.value,
      sortOrder: String(feature.sortOrder),
    });
    setEditingFeatureId(feature.featureId);
    setFeaturePlanId(planId);
    setShowFeatureModal(true);
  };

  const saveFeature = async () => {
    if (!featurePlanId) return;
    setFeatureSaving(true);
    try {
      const body = {
        key: featureForm.key,
        label: featureForm.label,
        type: featureForm.type,
        value: featureForm.value,
        sortOrder: Number(featureForm.sortOrder),
      };

      const url = editingFeatureId
        ? `/system/api/subscriptions/plans/${featurePlanId}/features/${editingFeatureId}`
        : `/system/api/subscriptions/plans/${featurePlanId}/features`;
      const method = editingFeatureId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowFeatureModal(false);
        fetchPlans();
      }
    } finally {
      setFeatureSaving(false);
    }
  };

  const deleteFeature = async (planId: string, featureId: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) return;
    try {
      const res = await fetch(`/system/api/subscriptions/plans/${planId}/features/${featureId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPlans();
      }
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-6">
      {/* General Subscription Settings */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-lg">General Settings</h3>
          <p className="text-sm text-base-content/60 mb-4">Configure subscription system behavior</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DynamicToggle
              label="Subscriptions Enabled"
              checked={settings.subscriptionEnabled === 'true'}
              onChange={v => setSettings(s => ({ ...s, subscriptionEnabled: String(v) }))}
              disabled={isDisabled}
            />

            <DynamicToggle
              label="Trial Enabled"
              checked={settings.trialEnabled === 'true'}
              onChange={v => setSettings(s => ({ ...s, trialEnabled: String(v) }))}
              disabled={isDisabled}
            />

            {settings.trialEnabled === 'true' && (
              <DynamicText
                label="Default Trial Days"
                type="number"
                placeholder="14"
                value={settings.defaultTrialDays || ''}
                setValue={v => setSettings(s => ({ ...s, defaultTrialDays: v }))}
                disabled={isDisabled}
              />
            )}

            <DynamicSelect
              label="Default Plan"
              selectedValue={settings.defaultPlanId || ''}
              onValueChange={v => setSettings(s => ({ ...s, defaultPlanId: v }))}
              options={[
                { value: '', label: 'None' },
                ...plans.map(p => ({ value: p.planId, label: p.name })),
              ]}
              disabled={isDisabled}
            />
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="card-title text-lg">Subscription Plans</h3>
              <p className="text-sm text-base-content/60">Manage subscription plans and pricing</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={openNewPlan}>
              <FontAwesomeIcon icon={faPlus} className="mr-1" />
              Add Plan
            </button>
          </div>

          {plansLoading ? (
            <div className="flex justify-center p-8">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              No subscription plans yet. Create your first plan.
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map(plan => (
                <div key={plan.planId} className="border border-base-300 rounded-lg">
                  {/* Plan Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-base-200/50"
                    onClick={() => setExpandedPlanId(expandedPlanId === plan.planId ? null : plan.planId)}
                  >
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon
                        icon={expandedPlanId === plan.planId ? faChevronUp : faChevronDown}
                        className="text-base-content/40 w-3"
                      />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {plan.name}
                          {plan.isDefault && (
                            <span className="badge badge-primary badge-xs">Default</span>
                          )}
                          <span className={`badge badge-xs ${plan.status === 'ACTIVE' ? 'badge-success' : plan.status === 'INACTIVE' ? 'badge-warning' : 'badge-ghost'}`}>
                            {plan.status}
                          </span>
                        </div>
                        <div className="text-sm text-base-content/60">
                          {plan.currency} {plan.monthlyPrice}/mo &middot; {plan.currency} {plan.yearlyPrice}/yr
                          {plan.trialDays > 0 && ` · ${plan.trialDays} day trial`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" onClick={() => openEditPlan(plan)}>
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => deletePlan(plan.planId)}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Features */}
                  {expandedPlanId === plan.planId && (
                    <div className="border-t border-base-300 p-4 bg-base-200/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">Plan Features</h4>
                        <button className="btn btn-ghost btn-xs" onClick={() => openNewFeature(plan.planId)}>
                          <FontAwesomeIcon icon={faPlus} className="mr-1" />
                          Add Feature
                        </button>
                      </div>

                      {plan.features.length === 0 ? (
                        <p className="text-sm text-base-content/50 text-center py-4">No features defined yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Key</th>
                                <th>Label</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Order</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {plan.features.map(feature => (
                                <tr key={feature.featureId}>
                                  <td className="font-mono text-xs">{feature.key}</td>
                                  <td>{feature.label}</td>
                                  <td>
                                    <span className={`badge badge-xs ${feature.type === 'BOOLEAN' ? 'badge-info' : 'badge-warning'}`}>
                                      {feature.type}
                                    </span>
                                  </td>
                                  <td>
                                    {feature.type === 'BOOLEAN'
                                      ? (feature.value === 'true' ? 'Yes' : 'No')
                                      : (feature.value === '-1' ? 'Unlimited' : feature.value)}
                                  </td>
                                  <td>{feature.sortOrder}</td>
                                  <td className="flex gap-1">
                                    <button className="btn btn-ghost btn-xs" onClick={() => openEditFeature(plan.planId, feature)}>
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteFeature(plan.planId, feature.featureId)}>
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">
              {editingPlanId ? 'Edit Plan' : 'New Plan'}
            </h3>
            <div className="space-y-3">
              <DynamicText
                label="Plan Name"
                placeholder="e.g. Pro, Enterprise"
                value={planForm.name}
                setValue={v => setPlanForm(f => ({ ...f, name: v }))}
                disabled={planSaving}
              />
              <DynamicText
                label="Description"
                placeholder="Plan description"
                value={planForm.description}
                setValue={v => setPlanForm(f => ({ ...f, description: v }))}
                isTextarea
                rows={2}
                disabled={planSaving}
              />
              <div className="grid grid-cols-2 gap-3">
                <DynamicText
                  label="Monthly Price"
                  type="number"
                  placeholder="9.99"
                  value={planForm.monthlyPrice}
                  setValue={v => setPlanForm(f => ({ ...f, monthlyPrice: v }))}
                  disabled={planSaving}
                />
                <DynamicText
                  label="Yearly Price"
                  type="number"
                  placeholder="99.99"
                  value={planForm.yearlyPrice}
                  setValue={v => setPlanForm(f => ({ ...f, yearlyPrice: v }))}
                  disabled={planSaving}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <DynamicSelect
                  label="Currency"
                  selectedValue={planForm.currency}
                  onValueChange={v => setPlanForm(f => ({ ...f, currency: v }))}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                    { value: 'TRY', label: 'TRY' },
                  ]}
                  disabled={planSaving}
                />
                <DynamicText
                  label="Trial Days"
                  type="number"
                  placeholder="0"
                  value={planForm.trialDays}
                  setValue={v => setPlanForm(f => ({ ...f, trialDays: v }))}
                  disabled={planSaving}
                />
                <DynamicText
                  label="Sort Order"
                  type="number"
                  placeholder="0"
                  value={planForm.sortOrder}
                  setValue={v => setPlanForm(f => ({ ...f, sortOrder: v }))}
                  disabled={planSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DynamicSelect
                  label="Status"
                  selectedValue={planForm.status}
                  onValueChange={v => setPlanForm(f => ({ ...f, status: v }))}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                    { value: 'ARCHIVED', label: 'Archived' },
                  ]}
                  disabled={planSaving}
                />
                <DynamicToggle
                  label="Default Plan"
                  checked={planForm.isDefault}
                  onChange={v => setPlanForm(f => ({ ...f, isDefault: v }))}
                  disabled={planSaving}
                />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowPlanModal(false)} disabled={planSaving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={savePlan} disabled={planSaving || !planForm.name}>
                {planSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowPlanModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* Feature Modal */}
      {showFeatureModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">
              {editingFeatureId ? 'Edit Feature' : 'New Feature'}
            </h3>
            <div className="space-y-3">
              <DynamicText
                label="Feature Key"
                placeholder="e.g. maxUsers, apiAccess"
                value={featureForm.key}
                setValue={v => setFeatureForm(f => ({ ...f, key: v }))}
                disabled={featureSaving}
              />
              <DynamicText
                label="Feature Label"
                placeholder="e.g. Max Users, API Access"
                value={featureForm.label}
                setValue={v => setFeatureForm(f => ({ ...f, label: v }))}
                disabled={featureSaving}
              />
              <div className="grid grid-cols-2 gap-3">
                <DynamicSelect
                  label="Type"
                  selectedValue={featureForm.type}
                  onValueChange={v => {
                    setFeatureForm(f => ({
                      ...f,
                      type: v,
                      value: v === 'BOOLEAN' ? 'true' : '10',
                    }));
                  }}
                  options={[
                    { value: 'BOOLEAN', label: 'Boolean (Yes/No)' },
                    { value: 'LIMIT', label: 'Limit (Number)' },
                  ]}
                  disabled={featureSaving}
                />
                {featureForm.type === 'BOOLEAN' ? (
                  <DynamicSelect
                    label="Value"
                    selectedValue={featureForm.value}
                    onValueChange={v => setFeatureForm(f => ({ ...f, value: v }))}
                    options={[
                      { value: 'true', label: 'Yes' },
                      { value: 'false', label: 'No' },
                    ]}
                    disabled={featureSaving}
                  />
                ) : (
                  <DynamicText
                    label="Value (-1 = Unlimited)"
                    type="number"
                    placeholder="10"
                    value={featureForm.value}
                    setValue={v => setFeatureForm(f => ({ ...f, value: v }))}
                    disabled={featureSaving}
                  />
                )}
              </div>
              <DynamicText
                label="Sort Order"
                type="number"
                placeholder="0"
                value={featureForm.sortOrder}
                setValue={v => setFeatureForm(f => ({ ...f, sortOrder: v }))}
                disabled={featureSaving}
              />
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowFeatureModal(false)} disabled={featureSaving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveFeature} disabled={featureSaving || !featureForm.key || !featureForm.label}>
                {featureSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowFeatureModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
