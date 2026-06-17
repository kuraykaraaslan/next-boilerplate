'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPercent, faDollarSign, faTrash, faSave } from '@fortawesome/free-solid-svg-icons';
import api from '@kuraykaraaslan/common/server/axios';
import type { DiscountType } from '@kuraykaraaslan/coupon/server/coupon.enums';
import { CouponScopePanel } from '@kuraykaraaslan/coupon/ui/coupon-scope-panel.component';
import { CouponArchiveModal } from '@kuraykaraaslan/coupon/ui/coupon-archive-modal.component';
import {
  type Coupon, type EditForm,
  statusVariant, statusOptions,
  toDatetimeLocal, buildScope, extractMessage,
} from '@kuraykaraaslan/coupon/ui/coupon-edit.utils';

export default function CouponEditPage({ params }: { params: Promise<{ tenantId: string; couponId: string }> }) {
  const { tenantId, couponId } = use(params);

  const [coupon, setCoupon]       = useState<Coupon | null>(null);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm]           = useState<EditForm | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);

  const resolveScopeRefs = useCallback(async (scope: Coupon['scope']) => {
    const products: { id: string; label: string }[] = [];
    const plans: { id: string; label: string }[] = [];
    if (scope?.planIds?.length) {
      try {
        const res = await api.get(`/tenant/${tenantId}/api/plans`);
        const all = (res.data.plans ?? []) as Array<{ planId: string; interval: string; product?: { name?: string } }>;
        const byId = new Map(all.map((p) => [p.planId, p]));
        for (const id of scope.planIds) {
          const p = byId.get(id);
          plans.push({ id, label: p ? `${p.product?.name ?? 'Plan'} · ${p.interval}` : id });
        }
      } catch { for (const id of scope.planIds) plans.push({ id, label: id }); }
    }
    if (scope?.productIds?.length) {
      const results = await Promise.all(scope.productIds.map(async (id) => {
        try { const res = await api.get(`/tenant/${tenantId}/api/store/products/${id}`); return { id, label: res.data.product?.name ?? id }; }
        catch { return { id, label: id }; }
      }));
      products.push(...results);
    }
    return { products, plans };
  }, [tenantId]);

  const fetchCoupon = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/coupons/${couponId}`);
      const c: Coupon = res.data.coupon;
      const { products, plans } = await resolveScopeRefs(c.scope);
      setCoupon(c);
      setForm({
        name: c.name, description: c.description ?? '', discountType: c.discountType,
        discountValue: String(c.discountValue), currency: c.currency ?? 'USD', status: c.status,
        maxUses: c.maxUses != null ? String(c.maxUses) : '',
        maxUsesPerTenant: c.maxUsesPerTenant != null ? String(c.maxUsesPerTenant) : '',
        startsAt: toDatetimeLocal(c.startsAt), expiresAt: toDatetimeLocal(c.expiresAt),
        scopeProducts: products, scopePlans: plans,
        scopeProviders: c.scope?.providers ?? [],
        scopeAppliesTo: c.scope?.appliesTo ?? '',
        scopeMinimumAmount: c.scope?.minimumAmount != null ? String(c.scope.minimumAmount) : '',
      });
    } catch (err: unknown) {
      setLoadError(extractMessage(err, 'Failed to load coupon.'));
    } finally { setLoading(false); }
  }, [tenantId, couponId, resolveScopeRefs]);

  useEffect(() => { fetchCoupon(); }, [fetchCoupon]);

  function handleField(key: keyof EditForm, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true); setSaveError('');
    try {
      const res = await api.put(`/tenant/${tenantId}/api/coupons/${couponId}`, {
        name: form.name, description: form.description || null,
        discountType: form.discountType, discountValue: parseFloat(form.discountValue),
        currency: form.discountType === 'FIXED_AMOUNT' ? form.currency : null,
        status: form.status,
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
        maxUsesPerTenant: form.maxUsesPerTenant ? parseInt(form.maxUsesPerTenant, 10) : null,
        scope: buildScope(form) ?? null,
        startsAt: form.startsAt || null, expiresAt: form.expiresAt || null,
      });
      setCoupon(res.data.coupon);
      toast.success('Coupon updated.');
    } catch (err: unknown) {
      setSaveError(extractMessage(err, 'Failed to update coupon.'));
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  if (loadError || !coupon || !form) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Coupons', href: `/tenant/${tenantId}/admin/coupons` }, { label: 'Coupon' }]} />
        <AlertBanner variant="error" message={loadError || 'Coupon not found.'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Coupons', href: `/tenant/${tenantId}/admin/coupons` }, { label: coupon.code }]} />
      <PageHeader title={coupon.code} subtitle={coupon.name}
        badge={<Badge variant={statusVariant[coupon.status]} dot>{coupon.status}</Badge>} />

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Details" headerRight={
            <Button type="submit" size="sm" variant="primary" loading={saving} iconLeft={<FontAwesomeIcon icon={faSave} />}>
              Save
            </Button>
          }>
            <div className="space-y-4">
              {saveError && <AlertBanner variant="error" message={saveError} dismissible />}
              <div className="grid grid-cols-2 gap-4">
                <Input id="coupon-code" label="Code" value={coupon.code} disabled
                  hint="The code cannot be changed after creation." className="font-mono uppercase" />
                <Input id="coupon-name" label="Name" value={form.name} required
                  onChange={(e) => handleField('name', e.target.value)} />
              </div>
              <Input id="coupon-description" label="Description" placeholder="Optional description"
                value={form.description} onChange={(e) => handleField('description', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Select id="coupon-discount-type" label="Discount Type" value={form.discountType}
                  onChange={(e) => handleField('discountType', e.target.value as DiscountType)}
                  options={[{ value: 'PERCENTAGE', label: 'Percentage (%)' }, { value: 'FIXED_AMOUNT', label: 'Fixed Amount' }]} />
                <Input id="coupon-discount-value"
                  label={form.discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount Amount'}
                  type="number" min="0" max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                  step="0.01" value={form.discountValue} required
                  onChange={(e) => handleField('discountValue', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {form.discountType === 'FIXED_AMOUNT' && (
                  <Input id="coupon-currency" label="Currency" placeholder="USD" maxLength={3}
                    value={form.currency} required
                    onChange={(e) => handleField('currency', e.target.value.toUpperCase())} />
                )}
                <Select id="coupon-status" label="Status" value={form.status}
                  onChange={(e) => handleField('status', e.target.value)}
                  options={statusOptions} />
              </div>
            </div>
          </Card>

          <Card title="Limits & Validity">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input id="coupon-max-uses" label="Max Total Uses" type="number" min="1"
                  placeholder="Unlimited" value={form.maxUses}
                  onChange={(e) => handleField('maxUses', e.target.value)} />
                <Input id="coupon-max-uses-per-tenant" label="Max Uses per Tenant" type="number" min="1"
                  placeholder="Unlimited" value={form.maxUsesPerTenant}
                  onChange={(e) => handleField('maxUsesPerTenant', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input id="coupon-starts-at" label="Starts At" type="datetime-local"
                  value={form.startsAt} onChange={(e) => handleField('startsAt', e.target.value)} />
                <Input id="coupon-expires-at" label="Expires At" type="datetime-local"
                  value={form.expiresAt} onChange={(e) => handleField('expiresAt', e.target.value)} />
              </div>
            </div>
          </Card>

          <CouponScopePanel
            tenantId={tenantId}
            value={{ scopeProducts: form.scopeProducts, scopePlans: form.scopePlans, scopeProviders: form.scopeProviders, scopeAppliesTo: form.scopeAppliesTo, scopeMinimumAmount: form.scopeMinimumAmount }}
            onChange={(patch) => setForm((f) => f ? { ...f, ...patch } : f)}
          />
        </div>

        <div className="space-y-4">
          <Card title="Meta">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-text-secondary mb-0.5">Discount</dt>
                <dd className="text-text-primary font-medium inline-flex items-center gap-1.5">
                  <FontAwesomeIcon icon={coupon.discountType === 'PERCENTAGE' ? faPercent : faDollarSign} className="w-3 h-3 text-text-secondary" />
                  {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `${coupon.discountValue} ${coupon.currency ?? ''}`}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Used</dt>
                <dd className="text-text-primary font-medium tabular-nums">
                  {coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Created</dt>
                <dd className="text-text-primary font-medium">{new Date(coupon.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-text-secondary mb-0.5">Updated</dt>
                <dd className="text-text-primary font-medium">{new Date(coupon.updatedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Actions">
            <Button type="button" variant="danger" fullWidth iconLeft={<FontAwesomeIcon icon={faTrash} />}
              disabled={coupon.status === 'ARCHIVED'}
              onClick={() => setArchiveOpen(true)}>
              {coupon.status === 'ARCHIVED' ? 'Archived' : 'Archive Coupon'}
            </Button>
          </Card>
        </div>
      </form>

      <CouponArchiveModal
        open={archiveOpen}
        tenantId={tenantId}
        couponId={couponId}
        couponCode={coupon.code}
        onClose={() => setArchiveOpen(false)}
      />
    </div>
  );
}
