'use client';

import { useState } from 'react';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import api from '@kuraykaraaslan/common/server/axios';

const PROVIDER_OPTIONS = ['STRIPE', 'PAYPAL', 'IYZICO', 'CLOUDPAYMENTS', 'YOOKASSA', 'ALIPAY', 'WECHATPAY'];

export type ScopeFormState = {
  scopeProducts: { id: string; label: string }[];
  scopePlans: { id: string; label: string }[];
  scopeProviders: string[];
  scopeAppliesTo: '' | 'line' | 'cart';
  scopeMinimumAmount: string;
};

type Props = {
  tenantId: string;
  value: ScopeFormState;
  onChange: (patch: Partial<ScopeFormState>) => void;
};

type ProductResult = { productId: string; name: string; slug: string; basePrice: number; currency: string };
type PlanResult = { planId: string; interval: string; product?: { name: string; currency: string; basePrice: number } };

export function CouponScopePanel({ tenantId, value, onChange }: Props) {
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [planSearch, setPlanSearch] = useState('');
  const [planResults, setPlanResults] = useState<PlanResult[]>([]);

  async function searchProducts(q: string) {
    setProductSearch(q);
    if (!q.trim()) { setProductResults([]); return; }
    try {
      const res = await api.get(`/tenant/${tenantId}/api/store/products`, { params: { search: q, pageSize: 8 } });
      setProductResults(res.data.data ?? []);
    } catch { setProductResults([]); }
  }

  async function searchPlans(q: string) {
    setPlanSearch(q);
    try {
      const res = await api.get(`/tenant/${tenantId}/api/plans`);
      const all = (res.data.plans ?? []) as PlanResult[];
      const filtered = q.trim()
        ? all.filter((p) => (p.product?.name ?? '').toLowerCase().includes(q.toLowerCase()))
        : all;
      setPlanResults(filtered.slice(0, 8));
    } catch { setPlanResults([]); }
  }

  return (
    <Card title="Scope" subtitle={'Empty fields mean “apply to all”.'}>
      <div className="space-y-4">
        {/* Products picker */}
        <div>
          <Input
            id="scope-product-search"
            label="Limit to specific products"
            placeholder="Type a product name…"
            hint="Pick one or more store products. Leave empty to apply to all products."
            value={productSearch}
            onChange={(e) => searchProducts(e.target.value)}
          />
          {productResults.length > 0 && (
            <div className="mt-1 border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-surface-base">
              {productResults.map((p) => {
                const already = value.scopeProducts.some((sp) => sp.id === p.productId);
                return (
                  <button key={p.productId} type="button" disabled={already}
                    onClick={() => {
                      onChange({ scopeProducts: [...value.scopeProducts, { id: p.productId, label: p.name }] });
                      setProductSearch(''); setProductResults([]);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-surface-overlay disabled:opacity-50 border-b border-border last:border-0">
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
          {value.scopeProducts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {value.scopeProducts.map((ref) => (
                <span key={ref.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle text-primary px-2 py-0.5 text-xs">
                  {ref.label}
                  <button type="button" aria-label={`Remove ${ref.label}`}
                    onClick={() => onChange({ scopeProducts: value.scopeProducts.filter((r) => r.id !== ref.id) })}
                    className="hover:opacity-70">
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
            onChange={(e) => searchPlans(e.target.value)}
            onFocus={() => { if (planResults.length === 0) searchPlans(''); }}
          />
          {planResults.length > 0 && (
            <div className="mt-1 border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-surface-base">
              {planResults.map((p) => {
                const already = value.scopePlans.some((sp) => sp.id === p.planId);
                const label = `${p.product?.name ?? 'Plan'} · ${p.interval}`;
                return (
                  <button key={p.planId} type="button" disabled={already}
                    onClick={() => {
                      onChange({ scopePlans: [...value.scopePlans, { id: p.planId, label }] });
                      setPlanSearch(''); setPlanResults([]);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-surface-overlay disabled:opacity-50 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{p.product?.name ?? 'Plan'}</p>
                      <p className="text-xs text-text-secondary">{p.interval} · {p.product?.basePrice ?? 0} {p.product?.currency ?? ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {value.scopePlans.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {value.scopePlans.map((ref) => (
                <span key={ref.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle text-primary px-2 py-0.5 text-xs">
                  {ref.label}
                  <button type="button" aria-label={`Remove ${ref.label}`}
                    onClick={() => onChange({ scopePlans: value.scopePlans.filter((r) => r.id !== ref.id) })}
                    className="hover:opacity-70">
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
                <input type="checkbox"
                  checked={value.scopeProviders.includes(prov)}
                  onChange={(e) => onChange({
                    scopeProviders: e.target.checked
                      ? [...value.scopeProviders, prov]
                      : value.scopeProviders.filter((p) => p !== prov),
                  })}
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
            value={value.scopeAppliesTo}
            onChange={(e) => onChange({ scopeAppliesTo: e.target.value as '' | 'line' | 'cart' })}
            options={[
              { value: '',     label: 'Line (default)' },
              { value: 'line', label: 'Line items'     },
              { value: 'cart', label: 'Cart total'     },
            ]}
          />
          <Input
            id="scope-min-amount"
            label="Minimum Amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="No minimum"
            value={value.scopeMinimumAmount}
            onChange={(e) => onChange({ scopeMinimumAmount: e.target.value })}
          />
        </div>
      </div>
    </Card>
  );
}
