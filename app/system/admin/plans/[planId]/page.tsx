'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/modules/ui/Card';
import { Badge } from '@/modules/ui/Badge';
import { Button } from '@/modules/ui/Button';
import { Spinner } from '@/modules/ui/Spinner';
import { AlertBanner } from '@/modules/ui/AlertBanner';
import { Modal } from '@/modules/ui/Modal';
import { Input } from '@/modules/ui/Input';
import { Breadcrumb } from '@/modules/ui/Breadcrumb';
import { PageHeader } from '@/modules/ui/PageHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPlus,
  faTrash,
  faSave,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/libs/axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

type Plan = {
  planId: string;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  trialDays: number;
  sortOrder: number;
  isDefault: boolean;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
};

type Feature = {
  featureId: string;
  key: string;
  label: string;
  type: 'BOOLEAN' | 'LIMIT';
  value: string;
  sortOrder: number;
};

type EditForm = {
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  currency: string;
  trialDays: string;
  sortOrder: string;
  isDefault: boolean;
  status: PlanStatus;
};

type FeatureForm = {
  key: string;
  label: string;
  type: 'BOOLEAN' | 'LIMIT';
  value: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusVariant = (s: PlanStatus): 'success' | 'warning' | 'neutral' => {
  if (s === 'ACTIVE') return 'success';
  if (s === 'INACTIVE') return 'warning';
  return 'neutral';
};

const planToForm = (plan: Plan): EditForm => ({
  name: plan.name,
  description: plan.description ?? '',
  monthlyPrice: String(plan.monthlyPrice),
  yearlyPrice: String(plan.yearlyPrice),
  currency: plan.currency,
  trialDays: String(plan.trialDays),
  sortOrder: String(plan.sortOrder),
  isDefault: plan.isDefault,
  status: plan.status,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const router = useRouter();

  // Plan state
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Features state
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [featuresError, setFeaturesError] = useState<string | null>(null);

  // Add feature modal
  const [addFeatureOpen, setAddFeatureOpen] = useState(false);
  const [featureForm, setFeatureForm] = useState<FeatureForm>({ key: '', label: '', type: 'BOOLEAN', value: 'true' });
  const [addingFeature, setAddingFeature] = useState(false);
  const [addFeatureError, setAddFeatureError] = useState<string | null>(null);

  // Delete feature confirm
  const [deleteFeatureId, setDeleteFeatureId] = useState<string | null>(null);
  const [deletingFeature, setDeletingFeature] = useState(false);
  const [deleteFeatureError, setDeleteFeatureError] = useState<string | null>(null);

  // Delete plan confirm
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [deletePlanError, setDeletePlanError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchPlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await api.get(`/system/api/subscriptions/plans/${planId}`);
      const p: Plan = res.data.plan;
      setPlan(p);
      setEditForm(planToForm(p));
    } catch (err: any) {
      setPlanError(err.response?.data?.message ?? err.message);
    } finally {
      setPlanLoading(false);
    }
  }, [planId]);

  const fetchFeatures = useCallback(async () => {
    setFeaturesLoading(true);
    setFeaturesError(null);
    try {
      const res = await api.get(`/system/api/subscriptions/plans/${planId}/features`);
      setFeatures(res.data.features ?? []);
    } catch (err: any) {
      setFeaturesError(err.response?.data?.message ?? err.message);
    } finally {
      setFeaturesLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchPlan();
    fetchFeatures();
  }, [fetchPlan, fetchFeatures]);

  // ---------------------------------------------------------------------------
  // Edit plan
  // ---------------------------------------------------------------------------

  const handleEditField =
    (field: keyof EditForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = field === 'isDefault'
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
      setEditForm((prev) => prev ? { ...prev, [field]: value } : prev);
    };

  const handleSave = async () => {
    if (!editForm) return;
    if (!editForm.name.trim()) {
      setSaveError('Plan name is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await api.put(`/system/api/subscriptions/plans/${planId}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        monthlyPrice: parseFloat(editForm.monthlyPrice) || 0,
        yearlyPrice: parseFloat(editForm.yearlyPrice) || 0,
        currency: editForm.currency.trim() || 'USD',
        trialDays: parseInt(editForm.trialDays, 10) || 0,
        sortOrder: parseInt(editForm.sortOrder, 10) || 0,
        isDefault: editForm.isDefault,
        status: editForm.status,
      });
      const updated: Plan = res.data.plan;
      setPlan(updated);
      setEditForm(planToForm(updated));
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(err.response?.data?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Add feature
  // ---------------------------------------------------------------------------

  const resetFeatureForm = () => {
    setFeatureForm({ key: '', label: '', type: 'BOOLEAN', value: 'true' });
    setAddFeatureError(null);
  };

  const handleFeatureField =
    (field: keyof FeatureForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFeatureForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleAddFeature = async () => {
    if (!featureForm.key.trim()) {
      setAddFeatureError('Feature key is required.');
      return;
    }
    if (!featureForm.label.trim()) {
      setAddFeatureError('Feature label is required.');
      return;
    }
    if (!featureForm.value.trim()) {
      setAddFeatureError('Feature value is required.');
      return;
    }
    setAddingFeature(true);
    setAddFeatureError(null);
    try {
      await api.post(`/system/api/subscriptions/plans/${planId}/features`, {
        key: featureForm.key.trim(),
        label: featureForm.label.trim(),
        type: featureForm.type,
        value: featureForm.value.trim(),
      });
      setAddFeatureOpen(false);
      resetFeatureForm();
      fetchFeatures();
    } catch (err: any) {
      setAddFeatureError(err.response?.data?.message ?? err.message);
    } finally {
      setAddingFeature(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete feature
  // ---------------------------------------------------------------------------

  const handleDeleteFeature = async () => {
    if (!deleteFeatureId) return;
    setDeletingFeature(true);
    setDeleteFeatureError(null);
    try {
      await api.delete(
        `/system/api/subscriptions/plans/${planId}/features/${deleteFeatureId}`
      );
      setDeleteFeatureId(null);
      fetchFeatures();
    } catch (err: any) {
      setDeleteFeatureError(err.response?.data?.message ?? err.message);
    } finally {
      setDeletingFeature(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete plan
  // ---------------------------------------------------------------------------

  const handleDeletePlan = async () => {
    setDeletingPlan(true);
    setDeletePlanError(null);
    try {
      await api.delete(`/system/api/subscriptions/plans/${planId}`);
      router.push('/system/admin/plans');
    } catch (err: any) {
      setDeletePlanError(err.response?.data?.message ?? err.message);
      setDeletingPlan(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render: loading / error
  // ---------------------------------------------------------------------------

  if (planLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (planError || !plan || !editForm) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Plans', href: '/system/admin/plans' }, { label: 'Plan' }]} />
        <AlertBanner variant="error" message={planError ?? 'Plan not found.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Plans', href: '/system/admin/plans' }, { label: plan.name }]} />

      <PageHeader
        title={plan.name}
        subtitle={`Plan ID: ${planId}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(plan.status)} dot>{plan.status}</Badge>
            {plan.isDefault && <Badge variant="primary">Default</Badge>}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: edit form + features */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit plan card */}
          <Card
            title="Plan Details"
            headerRight={
              <Button
                size="sm"
                variant="primary"
                loading={saving}
                iconLeft={<FontAwesomeIcon icon={faSave} />}
                onClick={handleSave}
              >
                Save
              </Button>
            }
          >
            <div className="space-y-4">
              {saveError && (
                <AlertBanner variant="error" message={saveError} dismissible />
              )}
              {saveSuccess && (
                <AlertBanner variant="success" message="Plan updated successfully." dismissible />
              )}

              <Input
                id="edit-plan-name"
                label="Name"
                value={editForm.name}
                onChange={handleEditField('name')}
                hint="Required"
              />
              <Input
                id="edit-plan-description"
                label="Description"
                value={editForm.description}
                onChange={handleEditField('description')}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="edit-plan-monthly-price"
                  label="Monthly Price"
                  type="number"
                  value={editForm.monthlyPrice}
                  onChange={handleEditField('monthlyPrice')}
                />
                <Input
                  id="edit-plan-yearly-price"
                  label="Yearly Price"
                  type="number"
                  value={editForm.yearlyPrice}
                  onChange={handleEditField('yearlyPrice')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="edit-plan-currency"
                  label="Currency"
                  value={editForm.currency}
                  onChange={handleEditField('currency')}
                />
                <Input
                  id="edit-plan-trial-days"
                  label="Trial Days"
                  type="number"
                  value={editForm.trialDays}
                  onChange={handleEditField('trialDays')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-plan-status"
                    className="block text-sm font-medium text-text-primary"
                  >
                    Status
                  </label>
                  <select
                    id="edit-plan-status"
                    value={editForm.status}
                    onChange={handleEditField('status')}
                    className="w-full rounded-md border border-border bg-surface-base px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <Input
                  id="edit-plan-sort-order"
                  label="Sort Order"
                  type="number"
                  value={editForm.sortOrder}
                  onChange={handleEditField('sortOrder')}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="edit-plan-is-default"
                  type="checkbox"
                  checked={editForm.isDefault}
                  onChange={handleEditField('isDefault')}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label
                  htmlFor="edit-plan-is-default"
                  className="text-sm font-medium text-text-primary select-none"
                >
                  Mark as default plan
                </label>
              </div>
            </div>
          </Card>

          {/* Features card */}
          <Card
            title="Features"
            headerRight={
              <Button
                size="sm"
                variant="outline"
                iconLeft={<FontAwesomeIcon icon={faPlus} />}
                onClick={() => { resetFeatureForm(); setAddFeatureOpen(true); }}
              >
                Add Feature
              </Button>
            }
          >
            {featuresLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : featuresError ? (
              <AlertBanner variant="error" message={featuresError} />
            ) : (
              <div className="overflow-x-auto -mx-6 -mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Key</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Label</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Type</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {features.map((f) => (
                      <tr key={f.featureId} className="hover:bg-surface-raised transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-text-primary">{f.key}</td>
                        <td className="px-6 py-4 text-text-primary">{f.label}</td>
                        <td className="px-6 py-4">
                          <Badge variant={f.type === 'BOOLEAN' ? 'primary' : 'neutral'}>
                            {f.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-text-secondary">{f.value}</td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="danger"
                            iconLeft={<FontAwesomeIcon icon={faTrash} />}
                            onClick={() => { setDeleteFeatureError(null); setDeleteFeatureId(f.featureId); }}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {features.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-text-secondary">
                          No features defined for this plan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right column: meta + actions */}
        <div className="space-y-4">
          <Card title="Meta">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-text-secondary mb-0.5">Currency</dt>
                <dd className="text-text-primary font-medium">{plan.currency}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Trial Days</dt>
                <dd className="text-text-primary font-medium">{plan.trialDays}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Sort Order</dt>
                <dd className="text-text-primary font-medium">{plan.sortOrder}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Created</dt>
                <dd className="text-text-primary font-medium">
                  {new Date(plan.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Updated</dt>
                <dd className="text-text-primary font-medium">
                  {new Date(plan.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Actions">
            <div className="space-y-2">
              <Button
                variant="danger"
                fullWidth
                iconLeft={<FontAwesomeIcon icon={faTrash} />}
                onClick={() => { setDeletePlanError(null); setDeletePlanOpen(true); }}
              >
                Delete Plan
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Feature Modal */}
      <Modal
        open={addFeatureOpen}
        onClose={() => { setAddFeatureOpen(false); resetFeatureForm(); }}
        title="Add Feature"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => { setAddFeatureOpen(false); resetFeatureForm(); }}
              disabled={addingFeature}
            >
              Cancel
            </Button>
            <Button variant="primary" loading={addingFeature} onClick={handleAddFeature}>
              Add Feature
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {addFeatureError && (
            <AlertBanner variant="error" message={addFeatureError} dismissible />
          )}
          <Input
            id="feature-key"
            label="Key"
            value={featureForm.key}
            onChange={handleFeatureField('key')}
            hint="Required — e.g. max_users"
          />
          <Input
            id="feature-label"
            label="Label"
            value={featureForm.label}
            onChange={handleFeatureField('label')}
            hint="Required — human-readable name"
          />
          <div className="space-y-1.5">
            <label
              htmlFor="feature-type"
              className="block text-sm font-medium text-text-primary"
            >
              Type
            </label>
            <select
              id="feature-type"
              value={featureForm.type}
              onChange={handleFeatureField('type')}
              className="w-full rounded-md border border-border bg-surface-base px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="LIMIT">LIMIT</option>
            </select>
          </div>
          <Input
            id="feature-value"
            label="Value"
            value={featureForm.value}
            onChange={handleFeatureField('value')}
            hint='Required — e.g. "true" or "100"'
          />
        </div>
      </Modal>

      {/* Delete Feature Confirm Modal */}
      <Modal
        open={!!deleteFeatureId}
        onClose={() => setDeleteFeatureId(null)}
        title="Delete Feature"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteFeatureId(null)} disabled={deletingFeature}>
              Cancel
            </Button>
            <Button variant="danger" loading={deletingFeature} onClick={handleDeleteFeature}>
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteFeatureError && (
            <AlertBanner variant="error" message={deleteFeatureError} />
          )}
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete this feature? This action cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Delete Plan Confirm Modal */}
      <Modal
        open={deletePlanOpen}
        onClose={() => setDeletePlanOpen(false)}
        title="Delete Plan"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletePlanOpen(false)} disabled={deletingPlan}>
              Cancel
            </Button>
            <Button variant="danger" loading={deletingPlan} onClick={handleDeletePlan}>
              Delete Plan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deletePlanError && (
            <AlertBanner variant="error" message={deletePlanError} />
          )}
          <p className="text-sm text-text-secondary">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-text-primary">{plan.name}</span>?
            This will also remove all associated features and cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}
