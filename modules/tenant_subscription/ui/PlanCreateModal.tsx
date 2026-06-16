'use client';

import { useState } from 'react';
import api from '@nb/common/server/axios';
import { Button } from '@nb/common/ui/Button';
import { Input } from '@nb/common/ui/Input';
import { Select } from '@nb/common/ui/Select';
import { Modal } from '@nb/common/ui/Modal';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { toast } from '@nb/common/ui/toast.store';

type BillingInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
type SearchProduct = { productId: string; name: string; slug: string; basePrice: number; currency: string; status: string };

const INTERVAL_OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: 'DAILY', label: 'Daily' }, { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' }, { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const EMPTY = { productId: '', interval: 'MONTHLY' as BillingInterval, trialDays: '0' };

function formatPrice(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  onCreate: () => void;
};

export function PlanCreateModal({ open, onClose, tenantId, onCreate }: Props) {
  const [form, setForm]                 = useState(EMPTY);
  const [submitting, setSubmitting]     = useState(false);
  const [createError, setCreateError]   = useState('');
  const [productSearch, setProductSearch]   = useState('');
  const [productResults, setProductResults] = useState<SearchProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null);

  function reset() {
    setForm(EMPTY); setCreateError('');
    setProductSearch(''); setProductResults([]); setSelectedProduct(null);
  }

  function handleClose() { reset(); onClose(); }

  async function searchProducts(q: string) {
    setProductSearch(q);
    if (!q.trim()) { setProductResults([]); return; }
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/products`, { params: { search: q, pageSize: 8 } });
      setProductResults(res.data.data ?? []);
    } catch { setProductResults([]); }
  }

  async function handleCreate() {
    if (!form.productId) { setCreateError('Please select a product for this plan.'); return; }
    setSubmitting(true); setCreateError('');
    try {
      await api.post(`/tenant/${tenantId}/api/plans`, {
        productId: form.productId,
        interval:  form.interval,
        trialDays: parseInt(form.trialDays, 10) || 0,
      });
      handleClose();
      toast.success('Plan created.');
      onCreate();
    } catch (err: unknown) {
      setCreateError(extractMessage(err, 'Failed to create plan.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Subscription Plan"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={handleCreate} disabled={!form.productId}>Create Plan</Button>
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
                    setSelectedProduct(p); setProductSearch(p.name); setProductResults([]);
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
            <p className="mt-1 text-xs text-success">Selected: {selectedProduct.name} ({selectedProduct.currency})</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select id="plan-interval" label="Billing Interval" required options={INTERVAL_OPTIONS} value={form.interval}
            onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value as BillingInterval }))} />
          <Input id="plan-trial-days" label="Trial Days" type="number" value={form.trialDays}
            onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))} />
        </div>
        <p className="text-xs text-text-secondary">
          Price is sourced from the wrapped product&apos;s base price.
        </p>
      </div>
    </Modal>
  );
}
