'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import { Card } from '@/modules_next/common/ui/Card';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { Spinner } from '@/modules_next/common/ui/Spinner';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faSave } from '@fortawesome/free-solid-svg-icons';
import api from '@/modules_next/common/axios';

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

const statusVariant: Record<PlanStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'warning',
  ARCHIVED: 'neutral',
};

const statusOptions = [
  { value: 'ACTIVE',   label: 'Active'   },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const featureTypeOptions = [
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'LIMIT',   label: 'Limit'   },
];

const planToForm = (plan: Plan): EditForm => ({
  name:         plan.name,
  description:  plan.description ?? '',
  monthlyPrice: String(plan.monthlyPrice),
  yearlyPrice:  String(plan.yearlyPrice),
  currency:     plan.currency,
  trialDays:    String(plan.trialDays),
  sortOrder:    String(plan.sortOrder),
  isDefault:    plan.isDefault,
  status:       plan.status,
});

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function PlanDetailPage({ params }: { params: Promise<{ tenantId: string; planId: string }> }) {
  const { tenantId, planId } = use(params);
  if (!isRootTenant(tenantId)) notFound();

  const router = useRouter();

  const [plan, setPlan]               = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError]     = useState('');

  const [editForm, setEditForm]   = useState<EditForm | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');

  const [features, setFeatures]                 = useState<Feature[]>([]);
  const [featuresLoading, setFeaturesLoading]   = useState(true);
  const [featuresError, setFeaturesError]       = useState('');

  const [addFeatureOpen, setAddFeatureOpen]     = useState(false);
  const [featureForm, setFeatureForm]           = useState<FeatureForm>({ key: '', label: '', type: 'BOOLEAN', value: 'true' });
  const [addingFeature, setAddingFeature]       = useState(false);
  const [addFeatureError, setAddFeatureError]   = useState('');

  const [deleteFeatureId, setDeleteFeatureId]   = useState<string | null>(null);
  const [deletingFeature, setDeletingFeature]   = useState(false);
  const [deleteFeatureError, setDeleteFeatureError] = useState('');

  const [deletePlanOpen, setDeletePlanOpen]     = useState(false);
  const [deletingPlan, setDeletingPlan]         = useState(false);
  const [deletePlanError, setDeletePlanError]   = useState('');

  const fetchPlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/plans/${planId}`);
      const p: Plan = res.data.plan;
      setPlan(p);
      setEditForm(planToForm(p));
    } catch (err: unknown) {
      setPlanError(extractMessage(err, 'Failed to load plan.'));
    } finally {
      setPlanLoading(false);
    }
  }, [tenantId, planId]);

  const fetchFeatures = useCallback(async () => {
    setFeaturesLoading(true);
    setFeaturesError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/plans/${planId}/features`);
      setFeatures(res.data.features ?? []);
    } catch (err: unknown) {
      setFeaturesError(extractMessage(err, 'Failed to load features.'));
    } finally {
      setFeaturesLoading(false);
    }
  }, [tenantId, planId]);

  useEffect(() => {
    fetchPlan();
    fetchFeatures();
  }, [fetchPlan, fetchFeatures]);

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
    setSaveError('');
    try {
      const res = await api.put(`/tenant/${tenantId}/api/plans/${planId}`, {
        name:         editForm.name.trim(),
        description:  editForm.description.trim() || null,
        monthlyPrice: parseFloat(editForm.monthlyPrice) || 0,
        yearlyPrice:  parseFloat(editForm.yearlyPrice)  || 0,
        currency:     editForm.currency.trim() || 'USD',
        trialDays:    parseInt(editForm.trialDays, 10)  || 0,
        sortOrder:    parseInt(editForm.sortOrder, 10)  || 0,
        isDefault:    editForm.isDefault,
        status:       editForm.status,
      });
      const updated: Plan = res.data.plan;
      setPlan(updated);
      setEditForm(planToForm(updated));
      toast.success('Plan updated.');
    } catch (err: unknown) {
      setSaveError(extractMessage(err, 'Failed to save plan.'));
    } finally {
      setSaving(false);
    }
  };

  const resetFeatureForm = () => {
    setFeatureForm({ key: '', label: '', type: 'BOOLEAN', value: 'true' });
    setAddFeatureError('');
  };

  const handleFeatureField =
    (field: keyof FeatureForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFeatureForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleAddFeature = async () => {
    if (!featureForm.key.trim())   { setAddFeatureError('Feature key is required.');   return; }
    if (!featureForm.label.trim()) { setAddFeatureError('Feature label is required.'); return; }
    if (!featureForm.value.trim()) { setAddFeatureError('Feature value is required.'); return; }
    setAddingFeature(true);
    setAddFeatureError('');
    try {
      await api.post(`/tenant/${tenantId}/api/plans/${planId}/features`, {
        key:   featureForm.key.trim(),
        label: featureForm.label.trim(),
        type:  featureForm.type,
        value: featureForm.value.trim(),
      });
      setAddFeatureOpen(false);
      resetFeatureForm();
      toast.success('Feature added.');
      fetchFeatures();
    } catch (err: unknown) {
      setAddFeatureError(extractMessage(err, 'Failed to add feature.'));
    } finally {
      setAddingFeature(false);
    }
  };

  const handleDeleteFeature = async () => {
    if (!deleteFeatureId) return;
    setDeletingFeature(true);
    setDeleteFeatureError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/plans/${planId}/features/${deleteFeatureId}`);
      setDeleteFeatureId(null);
      toast.success('Feature deleted.');
      fetchFeatures();
    } catch (err: unknown) {
      setDeleteFeatureError(extractMessage(err, 'Failed to delete feature.'));
    } finally {
      setDeletingFeature(false);
    }
  };

  const handleDeletePlan = async () => {
    setDeletingPlan(true);
    setDeletePlanError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/plans/${planId}`);
      toast.success('Plan deleted.');
      router.push(`/tenant/${tenantId}/admin/plans`);
    } catch (err: unknown) {
      setDeletePlanError(extractMessage(err, 'Failed to delete plan.'));
      setDeletingPlan(false);
    }
  };

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
        <Breadcrumb items={[{ label: 'Plans', href: `/tenant/${tenantId}/admin/plans` }, { label: 'Plan' }]} />
        <AlertBanner variant="error" message={planError || 'Plan not found.'} />
      </div>
    );
  }

  const featureColumns: TableColumn<Feature>[] = [
    {
      key: 'key',
      header: 'Key',
      render: (f) => <span className="font-mono text-xs text-text-primary">{f.key}</span>,
    },
    {
      key: 'label',
      header: 'Label',
      render: (f) => <span className="text-text-primary">{f.label}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (f) => (
        <Badge variant={f.type === 'BOOLEAN' ? 'primary' : 'neutral'}>{f.type}</Badge>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (f) => <span className="font-mono text-xs text-text-secondary">{f.value}</span>,
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (f) => (
        <RowActionsMenu
          actions={[
            {
              label: 'Delete',
              icon: <FontAwesomeIcon icon={faTrash} />,
              onClick: () => { setDeleteFeatureError(''); setDeleteFeatureId(f.featureId); },
              variant: 'danger',
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Plans', href: `/tenant/${tenantId}/admin/plans` }, { label: plan.name }]} />

      <PageHeader
        title={plan.name}
        subtitle={`Plan ID: ${planId}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[plan.status]} dot>{plan.status}</Badge>
            {plan.isDefault && <Badge variant="primary">Default</Badge>}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
              {saveError && <AlertBanner variant="error" message={saveError} dismissible />}

              <Input
                id="edit-plan-name"
                label="Name"
                value={editForm.name}
                onChange={handleEditField('name')}
                required
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
                <Select
                  id="edit-plan-status"
                  label="Status"
                  options={statusOptions}
                  value={editForm.status}
                  onChange={handleEditField('status')}
                />
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

          {featuresError ? (
            <AlertBanner variant="error" message={featuresError} />
          ) : (
            <ServerDataTable
              columns={featureColumns}
              rows={features}
              getRowKey={(f) => f.featureId}
              page={1}
              totalPages={1}
              total={features.length}
              onPageChange={() => {}}
              loading={featuresLoading}
              emptyMessage="No features defined for this plan."
              hidePagination
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
            />
          )}
        </div>

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
                <dd className="text-text-primary font-medium">{new Date(plan.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Updated</dt>
                <dd className="text-text-primary font-medium">{new Date(plan.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Actions">
            <Button
              variant="danger"
              fullWidth
              iconLeft={<FontAwesomeIcon icon={faTrash} />}
              onClick={() => { setDeletePlanError(''); setDeletePlanOpen(true); }}
            >
              Delete Plan
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={addFeatureOpen}
        onClose={() => { setAddFeatureOpen(false); resetFeatureForm(); }}
        title="Add Feature"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAddFeatureOpen(false); resetFeatureForm(); }} disabled={addingFeature}>
              Cancel
            </Button>
            <Button variant="primary" loading={addingFeature} onClick={handleAddFeature}>Add Feature</Button>
          </>
        }
      >
        <div className="space-y-4">
          {addFeatureError && <AlertBanner variant="error" message={addFeatureError} dismissible />}
          <Input
            id="feature-key"
            label="Key"
            value={featureForm.key}
            onChange={handleFeatureField('key')}
            required
            hint="e.g. max_users"
          />
          <Input
            id="feature-label"
            label="Label"
            value={featureForm.label}
            onChange={handleFeatureField('label')}
            required
            hint="Human-readable name"
          />
          <Select
            id="feature-type"
            label="Type"
            options={featureTypeOptions}
            value={featureForm.type}
            onChange={handleFeatureField('type')}
          />
          <Input
            id="feature-value"
            label="Value"
            value={featureForm.value}
            onChange={handleFeatureField('value')}
            required
            hint='e.g. "true" or "100"'
          />
        </div>
      </Modal>

      <Modal
        open={!!deleteFeatureId}
        onClose={() => setDeleteFeatureId(null)}
        title="Delete Feature"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteFeatureId(null)} disabled={deletingFeature}>Cancel</Button>
            <Button variant="danger" loading={deletingFeature} onClick={handleDeleteFeature}>Delete</Button>
          </>
        }
      >
        {deleteFeatureError && <AlertBanner variant="error" message={deleteFeatureError} />}
      </Modal>

      <Modal
        open={deletePlanOpen}
        onClose={() => setDeletePlanOpen(false)}
        title="Delete Plan"
        description={`Permanently delete ${plan.name}? This will also remove all associated features.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletePlanOpen(false)} disabled={deletingPlan}>Cancel</Button>
            <Button variant="danger" loading={deletingPlan} onClick={handleDeletePlan}>Delete Plan</Button>
          </>
        }
      >
        {deletePlanError && <AlertBanner variant="error" message={deletePlanError} />}
      </Modal>
    </div>
  );
}
