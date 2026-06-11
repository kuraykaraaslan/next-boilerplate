import type { CouponStatus, DiscountType } from '@/modules/coupon/coupon.enums';
import type { CouponScope } from '@/modules/coupon/coupon.dto';
import type { Coupon as CanonicalCoupon } from '@/modules/coupon/coupon.types';
import type { ScopeFormState } from './CouponScopePanel';

export type Coupon = Pick<
  CanonicalCoupon,
  'couponId' | 'code' | 'name' | 'description' | 'discountType' | 'discountValue' | 'currency' | 'scope' | 'maxUses' | 'maxUsesPerTenant' | 'usedCount' | 'status'
> & { startsAt: string | null; expiresAt: string | null; createdAt: string; updatedAt: string };

export type EditForm = {
  name: string; description: string; discountType: DiscountType; discountValue: string;
  currency: string; status: CouponStatus; maxUses: string; maxUsesPerTenant: string;
  startsAt: string; expiresAt: string;
} & ScopeFormState;

export const statusVariant: Record<CouponStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success', INACTIVE: 'warning', EXPIRED: 'error', ARCHIVED: 'neutral',
};

export const statusOptions = [
  { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' },
  { value: 'EXPIRED', label: 'Expired' }, { value: 'ARCHIVED', label: 'Archived' },
];

export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function buildScope(form: EditForm): CouponScope | undefined {
  const scope: CouponScope = {};
  if (form.scopeProducts.length > 0) scope.productIds = form.scopeProducts.map((r) => r.id);
  if (form.scopePlans.length > 0)    scope.planIds    = form.scopePlans.map((r) => r.id);
  if (form.scopeProviders.length > 0) scope.providers = form.scopeProviders;
  if (form.scopeAppliesTo) scope.appliesTo = form.scopeAppliesTo;
  if (form.scopeMinimumAmount && Number(form.scopeMinimumAmount) > 0) scope.minimumAmount = Number(form.scopeMinimumAmount);
  return Object.keys(scope).length > 0 ? scope : undefined;
}

export function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}
