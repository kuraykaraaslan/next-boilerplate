'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Badge } from '@/modules_next/common/ui/Badge';
import { Button } from '@/modules_next/common/ui/Button';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable, type TableColumn } from '@/modules_next/common/ui/ServerDataTable';
import { RowActionsMenu } from '@/modules_next/common/ui/RowActionsMenu';
import { toast } from '@/modules_next/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPercent, faDollarSign, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import api from '@/modules_next/common/axios';

type SelectedRef = { id: string; label: string };

type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'ARCHIVED';
type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

type CouponScope = {
  productIds?: string[];
  planIds?: string[];
  categoryIds?: string[];
  providers?: string[];
  appliesTo?: 'line' | 'cart';
  minimumAmount?: number;
};

type Coupon = {
  couponId: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  currency?: string | null;
  scope?: CouponScope | null;
  maxUses?: number | null;
  maxUsesPerTenant?: number | null;
  usedCount: number;
  status: CouponStatus;
  expiresAt?: string | null;
  createdAt: string;
};

type CreateForm = {
  code: string;
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  currency: string;
  maxUses: string;
  maxUsesPerTenant: string;
  expiresAt: string;
  // Scope (selections held as picker refs; flattened to UUIDs on submit)
  scopeProducts: SelectedRef[];
  scopePlans: SelectedRef[];
  scopeProviders: string[];
  scopeAppliesTo: '' | 'line' | 'cart';
  scopeMinimumAmount: string;
};

const PROVIDER_OPTIONS = ['STRIPE', 'PAYPAL', 'IYZICO', 'CLOUDPAYMENTS', 'YOOKASSA', 'ALIPAY', 'WECHATPAY'];

const EMPTY_FORM: CreateForm = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  currency: 'USD',
  maxUses: '',
  maxUsesPerTenant: '',
  expiresAt: '',
  scopeProducts: [],
  scopePlans: [],
  scopeProviders: [],
  scopeAppliesTo: '',
  scopeMinimumAmount: '',
};

function buildScope(form: CreateForm): CouponScope | undefined {
  const scope: CouponScope = {};
  if (form.scopeProducts.length > 0) scope.productIds = form.scopeProducts.map((r) => r.id);
  if (form.scopePlans.length > 0)    scope.planIds    = form.scopePlans.map((r) => r.id);
  if (form.scopeProviders.length > 0) scope.providers = form.scopeProviders;
  if (form.scopeAppliesTo) scope.appliesTo = form.scopeAppliesTo;
  if (form.scopeMinimumAmount && Number(form.scopeMinimumAmount) > 0) scope.minimumAmount = Number(form.scopeMinimumAmount);
  return Object.keys(scope).length > 0 ? scope : undefined;
}

function scopeSummary(scope: CouponScope | null | undefined): string {
  if (!scope) return 'All sales';
  const parts: string[] = [];
  if (scope.productIds?.length)  parts.push(`${scope.productIds.length} product${scope.productIds.length === 1 ? '' : 's'}`);
  if (scope.planIds?.length)     parts.push(`${scope.planIds.length} plan${scope.planIds.length === 1 ? '' : 's'}`);
  if (scope.providers?.length)   parts.push(`${scope.providers.length} provider${scope.providers.length === 1 ? '' : 's'}`);
  if (scope.appliesTo === 'cart') parts.push('cart-level');
  if (scope.minimumAmount && scope.minimumAmount > 0) parts.push(`min ${scope.minimumAmount}`);
  return parts.length > 0 ? parts.join(' · ') : 'All sales';
}

const PAGE_SIZE = 25;

const statusVariant: Record<CouponStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'warning',
  EXPIRED:  'error',
  ARCHIVED: 'neutral',
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function CouponsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [coupons, setCoupons]     = useState<Coupon[]>([]);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [createOpen, setCreateOpen]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm]               = useState<CreateForm>(EMPTY_FORM);

  const [archivingCoupon, setArchivingCoupon] = useState<Coupon | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  // Scope pickers
  const [productSearch, setProductSearch]   = useState('');
  const [productResults, setProductResults] = useState<Array<{ productId: string; name: string; slug: string; basePrice: number; currency: string }>>([]);
  const [planSearch, setPlanSearch]         = useState('');
  const [planResults, setPlanResults]       = useState<Array<{ planId: string; interval: string; product?: { name: string; currency: string; basePrice: number } }>>([]);

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

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/coupons?pageSize=100`);
      setCoupons(res.data.coupons ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load coupons.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  function handleField(key: keyof CreateForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCreateError('');
    try {
      await api.post(`/tenant/${tenantId}/api/coupons`, {
        code: form.code.toUpperCase(),
        name: form.name,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        currency: form.discountType === 'FIXED_AMOUNT' ? form.currency : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        maxUsesPerTenant: form.maxUsesPerTenant ? parseInt(form.maxUsesPerTenant) : undefined,
        scope: buildScope(form),
        expiresAt: form.expiresAt || undefined,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      toast.success('Coupon created.');
      fetchCoupons();
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create coupon.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!archivingCoupon) return;
    setArchiving(true);
    setArchiveError('');
    try {
      await api.delete(`/tenant/${tenantId}/api/coupons/${archivingCoupon.couponId}`);
      setArchivingCoupon(null);
      toast.success('Coupon archived.');
      fetchCoupons();
    } catch (err: unknown) {
      setArchiveError(extractMessage(err, 'Failed to archive coupon.'));
    } finally {
      setArchiving(false);
    }
  }

  const total = coupons.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = coupons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<Coupon>[] = [
    {
      key: 'code',
      header: 'Coupon',
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={c.discountType === 'PERCENTAGE' ? faPercent : faDollarSign} />
          </span>
          <div className="min-w-0">
            <p className="font-mono font-semibold tracking-wide text-text-primary">{c.code}</p>
            <p className="text-xs text-text-secondary truncate max-w-xs">{c.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'discountValue',
      header: 'Discount',
      render: (c) => (
        <span className="font-semibold tabular-nums text-text-primary">
          {c.discountType === 'PERCENTAGE'
            ? `${c.discountValue}%`
            : `${c.discountValue} ${c.currency ?? ''}`}
        </span>
      ),
    },
    {
      key: 'usedCount',
      header: 'Usage',
      render: (c) => (
        <span className="text-text-secondary text-sm tabular-nums">
          {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}
        </span>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (c) => (
        <span className="text-xs text-text-secondary truncate max-w-[200px] inline-block align-middle">
          {scopeSummary(c.scope)}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (c) => (
        <span className="text-text-secondary text-sm">
          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Badge variant={statusVariant[c.status]} dot>{c.status}</Badge>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: c.status === 'ARCHIVED' ? 'Archived' : 'Archive',
                icon: <FontAwesomeIcon icon={faTrash} />,
                onClick: () => { setArchivingCoupon(c); setArchiveError(''); },
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        subtitle="Create and manage discount codes for subscription plans."
        actions={[{ label: 'New Coupon', onClick: () => setCreateOpen(true) }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(c) => c.couponId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No coupons yet."
      />

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); setCreateError(''); }}
        title="New Coupon"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); setCreateError(''); }} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="coupon-form" loading={submitting}>Create</Button>
          </>
        }
      >
        <form id="coupon-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} />}

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="coupon-code"
              label="Code"
              placeholder="SUMMER25"
              value={form.code}
              onChange={(e) => handleField('code', e.target.value.toUpperCase())}
              required
              className="font-mono uppercase"
            />
            <Input
              id="coupon-name"
              label="Name"
              placeholder="Summer sale 25%"
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
              placeholder={form.discountType === 'PERCENTAGE' ? '25' : '10.00'}
              value={form.discountValue}
              onChange={(e) => handleField('discountValue', e.target.value)}
              required
            />
          </div>

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

          <Input
            id="coupon-expires-at"
            label="Expires At"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => handleField('expiresAt', e.target.value)}
          />

          <div className="border border-border rounded-lg p-4 space-y-4 bg-surface-sunken">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text-primary">Scope</h4>
              <p className="text-xs text-text-secondary">Empty fields mean &ldquo;apply to all&rdquo;.</p>
            </div>

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
                          setForm((f) => ({
                            ...f,
                            scopeProducts: [...f.scopeProducts, { id: p.productId, label: p.name }],
                          }));
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
                        onClick={() => setForm((f) => ({ ...f, scopeProducts: f.scopeProducts.filter((r) => r.id !== ref.id) }))}
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
                          setForm((f) => ({
                            ...f,
                            scopePlans: [...f.scopePlans, { id: p.planId, label }],
                          }));
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
                        onClick={() => setForm((f) => ({ ...f, scopePlans: f.scopePlans.filter((r) => r.id !== ref.id) }))}
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
                        setForm((f) => ({
                          ...f,
                          scopeProviders: e.target.checked
                            ? [...f.scopeProviders, prov]
                            : f.scopeProviders.filter((p) => p !== prov),
                        }));
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
        </form>
      </Modal>

      <Modal
        open={!!archivingCoupon}
        onClose={() => { setArchivingCoupon(null); setArchiveError(''); }}
        title="Archive Coupon"
        description={`Archive coupon ${archivingCoupon?.code}? It will no longer be usable.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setArchivingCoupon(null); setArchiveError(''); }} disabled={archiving}>
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
