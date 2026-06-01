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
import { faPlus, faTrash, faSave, faTag } from '@fortawesome/free-solid-svg-icons';
import api from '@/modules_next/common/axios';

type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

type PlanProduct = {
  productId: string;
  name: string;
  slug: string;
  currency: string;
  basePrice: number;
  shortDescription?: string | null;
  status: string;
};

type BillingInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

type Plan = {
  planId: string;
  productId: string;
  product: PlanProduct | null;
  interval: BillingInterval;
  trialDays: number;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
};

type SearchProduct = { productId: string; name: string; slug: string; basePrice: number; currency: string; status: string };

type Feature = {
  featureId: string;
  key: string;
  label: string;
  type: 'BOOLEAN' | 'LIMIT';
  value: string;
  sortOrder: number;
};

type EditForm = {
  productId: string;
  interval: BillingInterval;
  trialDays: string;
  status: PlanStatus;
};

const INTERVAL_LABEL: Record<BillingInterval, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly',
};
const INTERVAL_OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: 'DAILY',     label: 'Daily'     },
  { value: 'WEEKLY',    label: 'Weekly'    },
  { value: 'MONTHLY',   label: 'Monthly'   },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY',    label: 'Yearly'    },
];

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
  productId: plan.productId,
  interval:  plan.interval,
  trialDays: String(plan.trialDays),
  status:    plan.status,
});

function formatPrice(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

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

  // Product picker for "Change product"
  const [productPickerOpen, setProductPickerOpen]   = useState(false);
  const [productSearch, setProductSearch]           = useState('');
  const [productResults, setProductResults]         = useState<SearchProduct[]>([]);

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
      const value = e.target.value;
      setEditForm((prev) => prev ? { ...prev, [field]: value } : prev);
    };

  const handleSave = async () => {
    if (!editForm) return;
    if (!editForm.productId) {
      setSaveError('A plan must wrap a product.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const res = await api.put(`/tenant/${tenantId}/api/plans/${planId}`, {
        productId: editForm.productId,
        interval:  editForm.interval,
        trialDays: parseInt(editForm.trialDays, 10) || 0,
        status:    editForm.status,
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

  async function searchProducts(q: string) {
    setProductSearch(q);
    if (!q.trim()) { setProductResults([]); return; }
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/products`, { params: { search: q, pageSize: 8 } });
      setProductResults(res.data.data ?? []);
    } catch {
      setProductResults([]);
    }
  }

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
      <Breadcrumb items={[{ label: 'Plans', href: `/tenant/${tenantId}/admin/plans` }, { label: plan.product?.name ?? 'Plan' }]} />

      <PageHeader
        title={plan.product?.name ?? 'Plan'}
        subtitle={`Plan ID: ${planId}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[plan.status]} dot>{plan.status}</Badge>
            <Badge variant="neutral">{INTERVAL_LABEL[plan.interval] ?? plan.interval}</Badge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Wrapped Product" headerRight={
            <Button size="sm" variant="outline" onClick={() => { setProductSearch(''); setProductResults([]); setProductPickerOpen(true); }}>
              Change product
            </Button>
          }>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
                <FontAwesomeIcon icon={faTag} className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">{plan.product?.name ?? <span className="italic text-text-disabled">No product</span>}</p>
                <p className="text-xs text-text-secondary">
                  <code>{plan.product?.slug}</code> · base {formatPrice(plan.product?.basePrice ?? 0, plan.product?.currency ?? 'USD')}
                </p>
                {plan.product?.shortDescription && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">{plan.product.shortDescription}</p>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => router.push(`/tenant/${tenantId}/admin/store/products/${plan.productId}`)}>
                Open
              </Button>
            </div>
          </Card>

          <Card
            title="Billing & Status"
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

              <p className="text-xs text-text-secondary">
                Price comes from the wrapped product&apos;s base price ({formatPrice(plan.product?.basePrice ?? 0, plan.product?.currency ?? 'USD')}). Edit it from the product page if you need to change the amount.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <Select
                  id="edit-plan-interval"
                  label="Billing Interval"
                  required
                  options={INTERVAL_OPTIONS}
                  value={editForm.interval}
                  onChange={handleEditField('interval')}
                />
                <Input
                  id="edit-plan-trial-days"
                  label="Trial Days"
                  type="number"
                  value={editForm.trialDays}
                  onChange={handleEditField('trialDays')}
                />
                <Select
                  id="edit-plan-status"
                  label="Status"
                  options={statusOptions}
                  value={editForm.status}
                  onChange={handleEditField('status')}
                />
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
                <dd className="text-text-primary font-medium">{plan.product?.currency ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Trial Days</dt>
                <dd className="text-text-primary font-medium">{plan.trialDays}</dd>
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
        description={`Permanently delete this plan? This will also remove all associated features.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletePlanOpen(false)} disabled={deletingPlan}>Cancel</Button>
            <Button variant="danger" loading={deletingPlan} onClick={handleDeletePlan}>Delete Plan</Button>
          </>
        }
      >
        {deletePlanError && <AlertBanner variant="error" message={deletePlanError} />}
      </Modal>

      <Modal
        open={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        title="Change Wrapped Product"
        description="Pick a different store product. Name, currency and other display fields will follow the new product."
        footer={
          <Button variant="ghost" onClick={() => setProductPickerOpen(false)}>Cancel</Button>
        }
      >
        <div className="space-y-3">
          <Input
            id="picker-search"
            label="Search product"
            value={productSearch}
            onChange={(e) => searchProducts(e.target.value)}
            placeholder="Type a product name…"
          />
          {productResults.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {productResults.map((p) => (
                <button
                  key={p.productId}
                  type="button"
                  onClick={() => {
                    setEditForm((f) => f ? { ...f, productId: p.productId } : f);
                    setProductPickerOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-surface-overlay transition-colors border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary truncate">{p.name}</p>
                    <code className="text-xs text-text-secondary">{p.slug}</code>
                  </div>
                  <span className="text-text-secondary tabular-nums shrink-0">{formatPrice(p.basePrice, p.currency)}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-text-secondary">
            Selection only takes effect after you press <strong>Save</strong> on the Pricing &amp; Status card.
          </p>
        </div>
      </Modal>
    </div>
  );
}
