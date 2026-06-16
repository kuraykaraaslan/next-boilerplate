'use client';

import { useState } from 'react';
import { Button } from '@nb/common/ui/button.component';
import { Input } from '@nb/common/ui/input.component';
import { Select } from '@nb/common/ui/select.component';
import { Modal } from '@nb/common/ui/modal.component';
import { AlertBanner } from '@nb/common/ui/alert-banner.component';
import type { DiscountType } from '@nb/coupon/server/coupon.enums';
import type { CouponScope } from '@nb/coupon/server/coupon.dto';
import { CouponScopePanel, type ScopeFormState } from './coupon-scope-panel.component';

type CreateForm = {
  code: string; name: string; description: string;
  discountType: DiscountType; discountValue: string; currency: string;
  maxUses: string; maxUsesPerTenant: string; expiresAt: string;
} & ScopeFormState;

const EMPTY: CreateForm = {
  code: '', name: '', description: '', discountType: 'PERCENTAGE', discountValue: '',
  currency: 'USD', maxUses: '', maxUsesPerTenant: '', expiresAt: '',
  scopeProducts: [], scopePlans: [], scopeProviders: [], scopeAppliesTo: '', scopeMinimumAmount: '',
};

function buildScope(f: CreateForm): CouponScope | undefined {
  const scope: CouponScope = {};
  if (f.scopeProducts.length > 0) scope.productIds = f.scopeProducts.map((r) => r.id);
  if (f.scopePlans.length > 0)    scope.planIds    = f.scopePlans.map((r) => r.id);
  if (f.scopeProviders.length > 0) scope.providers = f.scopeProviders;
  if (f.scopeAppliesTo) scope.appliesTo = f.scopeAppliesTo;
  if (f.scopeMinimumAmount && Number(f.scopeMinimumAmount) > 0) scope.minimumAmount = Number(f.scopeMinimumAmount);
  return Object.keys(scope).length > 0 ? scope : undefined;
}

type Props = {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
};

export function CouponCreateModal({ open, onClose, tenantId, onSave }: Props) {
  const [form, setForm] = useState<CreateForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  function handleField(key: keyof CreateForm, value: string) { setForm((f) => ({ ...f, [key]: value })); }
  function handleClose() { setForm(EMPTY); setCreateError(''); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setCreateError('');
    try {
      await onSave({
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
      handleClose();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? err?.message ?? 'Failed to create coupon.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Coupon"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="coupon-create-form" loading={submitting}>Create</Button>
        </>
      }
    >
      <form id="coupon-create-form" onSubmit={handleSubmit} className="space-y-4">
        {createError && <AlertBanner variant="error" message={createError} />}
        <div className="grid grid-cols-2 gap-4">
          <Input id="coupon-code" label="Code" placeholder="SUMMER25" value={form.code} required
            className="font-mono uppercase"
            onChange={(e) => handleField('code', e.target.value.toUpperCase())} />
          <Input id="coupon-name" label="Name" placeholder="Summer sale 25%" value={form.name} required
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
            step="0.01" placeholder={form.discountType === 'PERCENTAGE' ? '25' : '10.00'}
            value={form.discountValue} required
            onChange={(e) => handleField('discountValue', e.target.value)} />
        </div>
        {form.discountType === 'FIXED_AMOUNT' && (
          <Input id="coupon-currency" label="Currency" placeholder="USD" maxLength={3}
            value={form.currency} required
            onChange={(e) => handleField('currency', e.target.value.toUpperCase())} />
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input id="coupon-max-uses" label="Max Total Uses" type="number" min="1"
            placeholder="Unlimited" value={form.maxUses}
            onChange={(e) => handleField('maxUses', e.target.value)} />
          <Input id="coupon-max-uses-per-tenant" label="Max Uses per Tenant" type="number" min="1"
            placeholder="Unlimited" value={form.maxUsesPerTenant}
            onChange={(e) => handleField('maxUsesPerTenant', e.target.value)} />
        </div>
        <Input id="coupon-expires-at" label="Expires At" type="datetime-local"
          value={form.expiresAt} onChange={(e) => handleField('expiresAt', e.target.value)} />

        <CouponScopePanel
          tenantId={tenantId}
          value={{ scopeProducts: form.scopeProducts, scopePlans: form.scopePlans, scopeProviders: form.scopeProviders, scopeAppliesTo: form.scopeAppliesTo, scopeMinimumAmount: form.scopeMinimumAmount }}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />
      </form>
    </Modal>
  );
}
