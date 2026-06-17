'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSave, faTag } from '@fortawesome/free-solid-svg-icons';
import api from '@kuraykaraaslan/common/server/axios';
import { PlanFeaturesPanel } from '@kuraykaraaslan/tenant_subscription/ui/plan-features-panel.component';
import {
  type Plan, type SearchProduct, type EditForm,
  statusVariant, INTERVAL_LABEL, INTERVAL_OPTIONS, STATUS_OPTIONS,
  formatPrice, extractMessage, planToForm,
} from './plan-edit.utils';

export default function PlanDetailPage({ params }: { params: Promise<{ tenantId: string; planId: string }> }) {
  const { tenantId, planId } = use(params);
  if (!isRootTenant(tenantId)) notFound();
  const router = useRouter();

  const [plan, setPlan]             = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError]   = useState('');
  const [editForm, setEditForm]     = useState<EditForm | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');

  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch]         = useState('');
  const [productResults, setProductResults]       = useState<SearchProduct[]>([]);

  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [deletingPlan, setDeletingPlan]     = useState(false);
  const [deletePlanError, setDeletePlanError] = useState('');

  const fetchPlan = useCallback(async () => {
    setPlanLoading(true); setPlanError('');
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

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const handleEditField = (field: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev);
  };

  const handleSave = async () => {
    if (!editForm) return;
    if (!editForm.productId) { setSaveError('A plan must wrap a product.'); return; }
    setSaving(true); setSaveError('');
    try {
      const res = await api.put(`/tenant/${tenantId}/api/plans/${planId}`, {
        productId: editForm.productId, interval: editForm.interval,
        trialDays: parseInt(editForm.trialDays, 10) || 0, status: editForm.status,
      });
      const updated: Plan = res.data.plan;
      setPlan(updated); setEditForm(planToForm(updated));
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
    } catch { setProductResults([]); }
  }

  const handleDeletePlan = async () => {
    setDeletingPlan(true); setDeletePlanError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/plans/${planId}`);
      toast.success('Plan deleted.');
      router.push(`/tenant/${tenantId}/admin/plans`);
    } catch (err: unknown) {
      setDeletePlanError(extractMessage(err, 'Failed to delete plan.'));
      setDeletingPlan(false);
    }
  };

  if (planLoading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  if (planError || !plan || !editForm) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Plans', href: `/tenant/${tenantId}/admin/plans` }, { label: 'Plan' }]} />
        <AlertBanner variant="error" message={planError || 'Plan not found.'} />
      </div>
    );
  }

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

          <Card title="Billing & Status" headerRight={
            <Button size="sm" variant="primary" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />} onClick={handleSave}>
              Save
            </Button>
          }>
            <div className="space-y-4">
              {saveError && <AlertBanner variant="error" message={saveError} dismissible />}
              <p className="text-xs text-text-secondary">
                Price comes from the wrapped product&apos;s base price ({formatPrice(plan.product?.basePrice ?? 0, plan.product?.currency ?? 'USD')}). Edit it from the product page if you need to change the amount.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <Select id="edit-plan-interval" label="Billing Interval" required options={INTERVAL_OPTIONS}
                  value={editForm.interval} onChange={handleEditField('interval')} />
                <Input id="edit-plan-trial-days" label="Trial Days" type="number"
                  value={editForm.trialDays} onChange={handleEditField('trialDays')} />
                <Select id="edit-plan-status" label="Status" options={STATUS_OPTIONS}
                  value={editForm.status} onChange={handleEditField('status')} />
              </div>
            </div>
          </Card>

          <PlanFeaturesPanel tenantId={tenantId} planId={planId} />
        </div>

        <div className="space-y-4">
          <Card title="Meta">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-text-secondary mb-0.5">Currency</dt><dd className="text-text-primary font-medium">{plan.product?.currency ?? '—'}</dd></div>
              <div><dt className="text-text-secondary mb-0.5">Trial Days</dt><dd className="text-text-primary font-medium">{plan.trialDays}</dd></div>
              <div><dt className="text-text-secondary mb-0.5">Created</dt><dd className="text-text-primary font-medium">{new Date(plan.createdAt).toLocaleDateString()}</dd></div>
              <div><dt className="text-text-secondary mb-0.5">Updated</dt><dd className="text-text-primary font-medium">{new Date(plan.updatedAt).toLocaleDateString()}</dd></div>
            </dl>
          </Card>
          <Card title="Actions">
            <Button variant="danger" fullWidth iconLeft={<FontAwesomeIcon icon={faTrash} />}
              onClick={() => { setDeletePlanError(''); setDeletePlanOpen(true); }}>
              Delete Plan
            </Button>
          </Card>
        </div>
      </div>

      <Modal open={productPickerOpen} onClose={() => setProductPickerOpen(false)}
        title="Change Wrapped Product"
        description="Pick a different store product. Name, currency and other display fields will follow the new product."
        footer={<Button variant="ghost" onClick={() => setProductPickerOpen(false)}>Cancel</Button>}
      >
        <div className="space-y-3">
          <Input id="picker-search" label="Search product" value={productSearch}
            onChange={(e) => searchProducts(e.target.value)} placeholder="Type a product name…" />
          {productResults.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {productResults.map((p) => (
                <button key={p.productId} type="button"
                  onClick={() => { setEditForm((f) => f ? { ...f, productId: p.productId } : f); setProductPickerOpen(false); }}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-surface-overlay transition-colors border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary truncate">{p.name}</p>
                    <code className="text-xs text-text-secondary">{p.slug}</code>
                  </div>
                  <span className="text-text-secondary tabular-nums shrink-0">{formatPrice(p.basePrice, p.currency)}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-text-secondary">Selection only takes effect after you press <strong>Save</strong> on the Billing &amp; Status card.</p>
        </div>
      </Modal>

      <Modal open={deletePlanOpen} onClose={() => setDeletePlanOpen(false)} title="Delete Plan"
        description="Permanently delete this plan? This will also remove all associated features."
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
