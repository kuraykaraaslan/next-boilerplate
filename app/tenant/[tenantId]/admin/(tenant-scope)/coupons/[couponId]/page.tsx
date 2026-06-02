'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPercent, faDollarSign, faTrash, faXmark, faSave } from '@fortawesome/free-solid-svg-icons';
import api from '@/modules_next/common/axios';
import type { CouponStatus, DiscountType } from '@/modules/coupon/coupon.enums';
import type { CouponScope } from '@/modules/coupon/coupon.dto';
import type { Coupon as CanonicalCoupon } from '@/modules/coupon/coupon.types';

type SelectedRef = { id: string; label: string };

type Coupon = Pick<
  CanonicalCoupon,
  'couponId' | 'code' | 'name' | 'description' | 'discountType' | 'discountValue' | 'currency' | 'scope' | 'maxUses' | 'maxUsesPerTenant' | 'usedCount' | 'status'
> & {
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type EditForm = {
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  currency: string;
  status: CouponStatus;
  maxUses: string;
  maxUsesPerTenant: string;
  startsAt: string;
  expiresAt: string;
  // Scope (selections held as picker refs; flattened to UUIDs on submit)
  scopeProducts: SelectedRef[];
  scopePlans: SelectedRef[];
  scopeProviders: string[];
  scopeAppliesTo: '' | 'line' | 'cart';
  scopeMinimumAmount: string;
};

const PROVIDER_OPTIONS = ['STRIPE', 'PAYPAL', 'IYZICO', 'CLOUDPAYMENTS', 'YOOKASSA', 'ALIPAY', 'WECHATPAY'];

const statusVariant: Record<CouponStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'warning',
  EXPIRED:  'error',
  ARCHIVED: 'neutral',
};

const statusOptions = [
  { value: 'ACTIVE',   label: 'Active'   },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'EXPIRED',  label: 'Expired'  },
  { value: 'ARCHIVED', label: 'Archived' },
];

/** Convert an ISO date string to a value the <input type="datetime-local"> understands. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildScope(form: EditForm): CouponScope | undefined {
  const scope: CouponScope = {};
  if (form.scopeProducts.length > 0) scope.productIds = form.scopeProducts.map((r) => r.id);
  if (form.scopePlans.length > 0)    scope.planIds    = form.scopePlans.map((r) => r.id);
  if (form.scopeProviders.length > 0) scope.providers = form.scopeProviders;
  if (form.scopeAppliesTo) scope.appliesTo = form.scopeAppliesTo;
  if (form.scopeMinimumAmount && Number(form.scopeMinimumAmount) > 0) scope.minimumAmount = Number(form.scopeMinimumAmount);
  return Object.keys(scope).length > 0 ? scope : undefined;
}

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function CouponEditPage({ params }: { params: Promise<{ tenantId: string; couponId: string }> }) {
  const { tenantId, couponId } = use(params);
  const router = useRouter();

  const [coupon, setCoupon]         = useState<Coupon | null>(null);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState('');

  const [form, setForm]             = useState<EditForm | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');

  const [archiveOpen, setArchiveOpen]   = useState(false);
  const [archiving, setArchiving]       = useState(false);
  const [archiveError, setArchiveError] = useState('');

  // Scope pickers
  const [productSearch, setProductSearch]   = useState('');
  const [productResults, setProductResults] = useState<Array<{ productId: string; name: string; slug: string; basePrice: number; currency: string }>>([]);
  const [planSearch, setPlanSearch]         = useState('');
  const [planResults, setPlanResults]       = useState<Array<{ planId: string; interval: string; product?: { name: string; currency: string; basePrice: number } }>>([]);

  /** Resolve bare scope UUIDs to human-readable labels so the chips are meaningful. */
  const resolveScopeRefs = useCallback(async (scope: CouponScope | null | undefined): Promise<{ products: SelectedRef[]; plans: SelectedRef[] }> => {
    const products: SelectedRef[] = [];
    const plans: SelectedRef[] = [];

    if (scope?.planIds?.length) {
      try {
        const res = await api.get(`/tenant/${tenantId}/api/plans`);
        const all = (res.data.plans ?? []) as Array<{ planId: string; interval: string; product?: { name?: string } }>;
        const byId = new Map(all.map((p) => [p.planId, p]));
        for (const id of scope.planIds) {
          const p = byId.get(id);
          plans.push({ id, label: p ? `${p.product?.name ?? 'Plan'} · ${p.interval}` : id });
        }
      } catch {
        for (const id of scope.planIds) plans.push({ id, label: id });
      }
    }

    if (scope?.productIds?.length) {
      const results = await Promise.all(
        scope.productIds.map(async (id) => {
          try {
            const res = await api.get(`/tenant/${tenantId}/api/store/products/${id}`);
            return { id, label: res.data.product?.name ?? id };
          } catch {
            return { id, label: id };
          }
        }),
      );
      products.push(...results);
    }

    return { products, plans };
  }, [tenantId]);

  const fetchCoupon = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/coupons/${couponId}`);
      const c: Coupon = res.data.coupon;
      const { products, plans } = await resolveScopeRefs(c.scope);
      setCoupon(c);
      setForm({
        name: c.name,
        description: c.description ?? '',
        discountType: c.discountType,
        discountValue: String(c.discountValue),
        currency: c.currency ?? 'USD',
        status: c.status,
        maxUses: c.maxUses != null ? String(c.maxUses) : '',
        maxUsesPerTenant: c.maxUsesPerTenant != null ? String(c.maxUsesPerTenant) : '',
        startsAt: toDatetimeLocal(c.startsAt),
        expiresAt: toDatetimeLocal(c.expiresAt),
        scopeProducts: products,
        scopePlans: plans,
        scopeProviders: c.scope?.providers ?? [],
        scopeAppliesTo: c.scope?.appliesTo ?? '',
        scopeMinimumAmount: c.scope?.minimumAmount != null ? String(c.scope.minimumAmount) : '',
      });
    } catch (err: unknown) {
      setLoadError(extractMessage(err, 'Failed to load coupon.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, couponId, resolveScopeRefs]);

  useEffect(() => { fetchCoupon(); }, [fetchCoupon]);

  function handleField(key: keyof EditForm, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function searchProductsForScope(q: string) {
    setProductSearch(q);
    if (!q.trim()) { setProductResults([]); return; }
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/products`, { params: { search: q, pageSize: 8 } });
      setProductResults(res.data.data ?? []);
    } catch { setProductResults([]); }
  }

  async function searchPlansForScope(q: string) {
    setPlanSearch(q);
    try {
      const res = await api.get(`/tenant/${tenantId}/api/plans`);
      const all = (res.data.plans ?? []) as Array<{
        planId: string;
        interval: string;
        product?: { name: string; currency: string; basePrice: number };
      }>;
      const filtered = q.trim()
        ? all.filter((p) => (p.product?.name ?? '').toLowerCase().includes(q.toLowerCase()))
        : all;
      setPlanResults(filtered.slice(0, 8));
    } catch { setPlanResults([]); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await api.put(`/tenant/${tenantId}/api/coupons/${couponId}`, {
        name: form.name,
        description: form.description || null,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        currency: form.discountType === 'FIXED_AMOUNT' ? form.currency : null,
        status: form.status,
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
        maxUsesPerTenant: form.maxUsesPerTenant ? parseInt(form.maxUsesPerTenant, 10) : null,
        scope: buildScope(form) ?? null,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
      });
      const updated: Coupon = res.data.coupon;
      setCoupon(updated);
      toast.success('Coupon updated.');
    } catch (err: unknown) {
      setSaveError(extractMessage(err, 'Failed to update coupon.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    setArchiveError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/coupons/${couponId}`);
      toast.success('Coupon archived.');
      router.push(`/tenant/${tenantId}/admin/coupons`);
    } catch (err: unknown) {
      setArchiveError(extractMessage(err, 'Failed to archive coupon.'));
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

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

      <PageHeader
        title={coupon.code}
        subtitle={coupon.name}
        badge={<Badge variant={statusVariant[coupon.status]} dot>{coupon.status}</Badge>}
      />

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Details"
            headerRight={
              <Button
                type="submit"
                size="sm"
                variant="primary"
                loading={saving}
                iconLeft={<FontAwesomeIcon icon={faSave} />}
              >
                Save
              </Button>
            }
          >
            <div className="space-y-4">
              {saveError && <AlertBanner variant="error" message={saveError} dismissible />}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="coupon-code"
                  label="Code"
                  value={coupon.code}
                  disabled
                  hint="The code cannot be changed after creation."
                  className="font-mono uppercase"
                />
                <Input
                  id="coupon-name"
                  label="Name"
                  value={form.name}
                  onChange={(e) => handleField('name', e.target.value)}
                  required
                />
              </div>

              <Input
                id="coupon-description"
                label="Description"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => handleField('description', e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="coupon-discount-type"
                  label="Discount Type"
                  value={form.discountType}
                  onChange={(e) => handleField('discountType', e.target.value as DiscountType)}
                  options={[
                    { value: 'PERCENTAGE',   label: 'Percentage (%)' },
                    { value: 'FIXED_AMOUNT', label: 'Fixed Amount'   },
                  ]}
                />
                <Input
                  id="coupon-discount-value"
                  label={form.discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount Amount'}
                  type="number"
                  min="0"
                  max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => handleField('discountValue', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {form.discountType === 'FIXED_AMOUNT' && (
                  <Input
                    id="coupon-currency"
                    label="Currency"
                    placeholder="USD"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => handleField('currency', e.target.value.toUpperCase())}
                    required
                  />
                )}
                <Select
                  id="coupon-status"
                  label="Status"
                  value={form.status}
                  onChange={(e) => handleField('status', e.target.value as CouponStatus)}
                  options={statusOptions}
                />
              </div>
            </div>
          </Card>

          <Card title="Limits & Validity">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="coupon-max-uses"
                  label="Max Total Uses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={form.maxUses}
                  onChange={(e) => handleField('maxUses', e.target.value)}
                />
                <Input
                  id="coupon-max-uses-per-tenant"
                  label="Max Uses per Tenant"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={form.maxUsesPerTenant}
                  onChange={(e) => handleField('maxUsesPerTenant', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="coupon-starts-at"
                  label="Starts At"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => handleField('startsAt', e.target.value)}
                />
                <Input
                  id="coupon-expires-at"
                  label="Expires At"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => handleField('expiresAt', e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card title="Scope" subtitle="Empty fields mean “apply to all”.">
            <div className="space-y-4">
              {/* Products picker */}
              <div>
                <Input
                  id="scope-product-search"
                  label="Limit to specific products"
                  placeholder="Type a product name…"
                  hint="Pick one or more store products. Leave empty to apply to all products."
                  value={productSearch}
                  onChange={(e) => searchProductsForScope(e.target.value)}
                />
                {productResults.length > 0 && (
                  <div className="mt-1 border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-surface-base">
                    {productResults.map((p) => {
                      const already = form.scopeProducts.some((sp) => sp.id === p.productId);
                      return (
                        <button
                          key={p.productId}
                          type="button"
                          disabled={already}
                          onClick={() => {
                            setForm((f) => (f ? {
                              ...f,
                              scopeProducts: [...f.scopeProducts, { id: p.productId, label: p.name }],
                            } : f));
                            setProductSearch('');
                            setProductResults([]);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-surface-overlay disabled:opacity-50 border-b border-border last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-text-primary truncate">{p.name}</p>
                            <code className="text-xs text-text-secondary">{p.slug}</code>
                          </div>
                          <span className="text-xs text-text-secondary tabular-nums shrink-0">{p.basePrice} {p.currency}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.scopeProducts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.scopeProducts.map((ref) => (
                      <span key={ref.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle text-primary px-2 py-0.5 text-xs">
                        {ref.label}
                        <button
                          type="button"
                          aria-label={`Remove ${ref.label}`}
                          onClick={() => setForm((f) => (f ? { ...f, scopeProducts: f.scopeProducts.filter((r) => r.id !== ref.id) } : f))}
                          className="hover:opacity-70"
                        >
                          <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Plans picker */}
              <div>
                <Input
                  id="scope-plan-search"
                  label="Limit to specific subscription plans"
                  placeholder="Type to list / filter plans…"
                  hint="Pick one or more plans. Leave empty to apply to all plans."
                  value={planSearch}
                  onChange={(e) => searchPlansForScope(e.target.value)}
                  onFocus={() => { if (planResults.length === 0) searchPlansForScope(''); }}
                />
                {planResults.length > 0 && (
                  <div className="mt-1 border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-surface-base">
                    {planResults.map((p) => {
                      const already = form.scopePlans.some((sp) => sp.id === p.planId);
                      const label = `${p.product?.name ?? 'Plan'} · ${p.interval}`;
                      return (
                        <button
                          key={p.planId}
                          type="button"
                          disabled={already}
                          onClick={() => {
                            setForm((f) => (f ? {
                              ...f,
                              scopePlans: [...f.scopePlans, { id: p.planId, label }],
                            } : f));
                            setPlanSearch('');
                            setPlanResults([]);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-surface-overlay disabled:opacity-50 border-b border-border last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-text-primary truncate">{p.product?.name ?? 'Plan'}</p>
                            <p className="text-xs text-text-secondary">{p.interval} · {p.product?.basePrice ?? 0} {p.product?.currency ?? ''}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.scopePlans.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.scopePlans.map((ref) => (
                      <span key={ref.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle text-primary px-2 py-0.5 text-xs">
                        {ref.label}
                        <button
                          type="button"
                          aria-label={`Remove ${ref.label}`}
                          onClick={() => setForm((f) => (f ? { ...f, scopePlans: f.scopePlans.filter((r) => r.id !== ref.id) } : f))}
                          className="hover:opacity-70"
                        >
                          <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-sm font-medium text-text-primary block mb-1.5">Providers</span>
                <div className="flex flex-wrap gap-3">
                  {PROVIDER_OPTIONS.map((prov) => (
                    <label key={prov} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.scopeProviders.includes(prov)}
                        onChange={(e) => {
                          setForm((f) => (f ? {
                            ...f,
                            scopeProviders: e.target.checked
                              ? [...f.scopeProviders, prov]
                              : f.scopeProviders.filter((p) => p !== prov),
                          } : f));
                        }}
                      />
                      {prov}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="scope-applies-to"
                  label="Applies To"
                  value={form.scopeAppliesTo}
                  onChange={(e) => handleField('scopeAppliesTo', e.target.value)}
                  options={[
                    { value: '',     label: 'Line (default)' },
                    { value: 'line', label: 'Line items' },
                    { value: 'cart', label: 'Cart total' },
                  ]}
                />
                <Input
                  id="scope-min-amount"
                  label="Minimum Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No minimum"
                  value={form.scopeMinimumAmount}
                  onChange={(e) => handleField('scopeMinimumAmount', e.target.value)}
                />
              </div>
            </div>
          </Card>
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
            <Button
              type="button"
              variant="danger"
              fullWidth
              iconLeft={<FontAwesomeIcon icon={faTrash} />}
              disabled={coupon.status === 'ARCHIVED'}
              onClick={() => { setArchiveError(''); setArchiveOpen(true); }}
            >
              {coupon.status === 'ARCHIVED' ? 'Archived' : 'Archive Coupon'}
            </Button>
          </Card>
        </div>
      </form>

      <Modal
        open={archiveOpen}
        onClose={() => { setArchiveOpen(false); setArchiveError(''); }}
        title="Archive Coupon"
        description={`Archive coupon ${coupon.code}? It will no longer be usable.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setArchiveOpen(false); setArchiveError(''); }} disabled={archiving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleArchive} loading={archiving}>Archive</Button>
          </>
        }
      >
        {archiveError && <AlertBanner variant="error" message={archiveError} />}
      </Modal>
    </div>
  );
}
