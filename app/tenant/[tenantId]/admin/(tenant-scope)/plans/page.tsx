'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { faTag, faPenToSquare, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
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
  product: PlanProduct;
  interval: BillingInterval;
  trialDays: number;
  status: PlanStatus;
  createdAt: string;
  _count?: { subscriptions: number };
};

type SearchProduct = { productId: string; name: string; slug: string; basePrice: number; currency: string; status: string };

type CreatePlanForm = {
  productId: string;
  interval: BillingInterval;
  trialDays: string;
};

const EMPTY_FORM: CreatePlanForm = {
  productId: '',
  interval: 'MONTHLY',
  trialDays: '0',
};

const INTERVAL_LABEL: Record<BillingInterval, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly',
};
const INTERVAL_SHORT: Record<BillingInterval, string> = {
  DAILY: 'day', WEEKLY: 'wk', MONTHLY: 'mo', QUARTERLY: 'qtr', YEARLY: 'yr',
};
const INTERVAL_OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: 'DAILY',     label: 'Daily'     },
  { value: 'WEEKLY',    label: 'Weekly'    },
  { value: 'MONTHLY',   label: 'Monthly'   },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY',    label: 'Yearly'    },
];

const PAGE_SIZE = 25;

const statusVariant: Record<PlanStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE:   'success',
  INACTIVE: 'warning',
  ARCHIVED: 'neutral',
};

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function formatPrice(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

export default function PlansPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();

  const [plans, setPlans]     = useState<Plan[]>([]);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [createOpen, setCreateOpen]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm]               = useState<CreatePlanForm>(EMPTY_FORM);

  // Product picker
  const [productSearch, setProductSearch]   = useState('');
  const [productResults, setProductResults] = useState<SearchProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/plans`);
      setPlans(res.data.plans ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load plans.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

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

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setCreateError('');
    setProductSearch('');
    setProductResults([]);
    setSelectedProduct(null);
  };

  const handleCreate = async () => {
    if (!form.productId) {
      setCreateError('Please select a product for this plan.');
      return;
    }
    setSubmitting(true);
    setCreateError('');
    try {
      await api.post(`/tenant/${tenantId}/api/plans`, {
        productId: form.productId,
        interval:  form.interval,
        trialDays: parseInt(form.trialDays, 10) || 0,
      });
      setCreateOpen(false);
      resetForm();
      toast.success('Plan created.');
      fetchPlans();
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create plan.'));
    } finally {
      setSubmitting(false);
    }
  };

  const total = plans.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = plans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<Plan>[] = [
    {
      key: 'product',
      header: 'Plan / Product',
      render: (plan) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary shrink-0">
            <FontAwesomeIcon icon={faTag} className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate">
              {plan.product?.name ?? <span className="italic text-text-disabled">No product</span>}
            </p>
            <p className="text-xs text-text-secondary truncate max-w-[260px]">
              <code>{plan.product?.slug}</code>
              {plan.product?.shortDescription ? ` · ${plan.product.shortDescription}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'interval',
      header: 'Interval',
      render: (plan) => <Badge variant="neutral" size="sm">{INTERVAL_LABEL[plan.interval] ?? plan.interval}</Badge>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (plan) => (
        <span className="text-text-primary tabular-nums">
          {formatPrice(plan.product?.basePrice ?? 0, plan.product?.currency ?? 'USD')}
          <span className="text-xs text-text-secondary ml-1">/{INTERVAL_SHORT[plan.interval] ?? plan.interval.toLowerCase()}</span>
        </span>
      ),
    },
    {
      key: 'trialDays',
      header: 'Trial',
      render: (plan) => (
        <span className="text-text-secondary">
          {plan.trialDays > 0 ? `${plan.trialDays}d` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (plan) => <Badge variant={statusVariant[plan.status]} dot>{plan.status}</Badge>,
    },
    {
      key: 'subscriptions',
      header: 'Tenants',
      render: (plan) => (
        <span className="text-text-primary tabular-nums">{plan._count?.subscriptions ?? '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (plan) => (
        <span className="text-text-secondary">{new Date(plan.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (plan) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            actions={[
              {
                label: 'Manage',
                icon: <FontAwesomeIcon icon={faPenToSquare} />,
                onClick: () => router.push(`/tenant/${tenantId}/admin/plans/${plan.planId}`),
              },
              {
                label: 'Open product',
                icon: <FontAwesomeIcon icon={faBoxOpen} />,
                onClick: () => router.push(`/tenant/${tenantId}/admin/store/products/${plan.productId}`),
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
        title="Subscription Plans"
        subtitle="Plans wrap a product with billing recurrence (monthly/yearly + trial)"
        actions={[{ label: 'Create Plan', onClick: () => { resetForm(); setCreateOpen(true); } }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} dismissible />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(p) => p.planId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/tenant/${tenantId}/admin/plans/${p.planId}`)}
        loading={loading}
        emptyMessage="No subscription plans yet."
      />

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        title="Create Subscription Plan"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); resetForm(); }} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleCreate} disabled={!form.productId}>
              Create Plan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && <AlertBanner variant="error" message={createError} dismissible />}

          <div>
            <Input
              id="plan-product-search"
              label="Product"
              required
              value={productSearch}
              onChange={(e) => searchProducts(e.target.value)}
              placeholder="Search a product to wrap…"
              hint="A plan wraps a single Store product. Name, description and currency come from the product."
            />
            {productResults.length > 0 && (
              <div className="mt-1 border border-border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                {productResults.map((p) => (
                  <button
                    key={p.productId}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, productId: p.productId }));
                      setSelectedProduct(p);
                      setProductSearch(p.name);
                      setProductResults([]);
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
            {selectedProduct && (
              <p className="mt-1 text-xs text-success">
                Selected: {selectedProduct.name} ({selectedProduct.currency})
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="plan-interval"
              label="Billing Interval"
              required
              options={INTERVAL_OPTIONS}
              value={form.interval}
              onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value as BillingInterval }))}
            />
            <Input
              id="plan-trial-days"
              label="Trial Days"
              type="number"
              value={form.trialDays}
              onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
            />
          </div>
          <p className="text-xs text-text-secondary">
            Price is sourced from the wrapped product&apos;s base price.
          </p>
        </div>
      </Modal>
    </div>
  );
}
