export type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type BillingInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type PlanProduct = {
  productId: string; name: string; slug: string;
  currency: string; basePrice: number; shortDescription?: string | null; status: string;
};

export type Plan = {
  planId: string; productId: string; product: PlanProduct | null;
  interval: BillingInterval; trialDays: number; status: PlanStatus;
  createdAt: string; updatedAt: string;
};

export type SearchProduct = {
  productId: string; name: string; slug: string; basePrice: number; currency: string; status: string;
};

export type EditForm = {
  productId: string; interval: BillingInterval; trialDays: string; status: PlanStatus;
};

export const statusVariant: Record<PlanStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success', INACTIVE: 'warning', ARCHIVED: 'neutral',
};

export const INTERVAL_LABEL: Record<BillingInterval, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly',
};

export const INTERVAL_OPTIONS = [
  { value: 'DAILY', label: 'Daily' }, { value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' }, { value: 'YEARLY', label: 'Yearly' },
];

export const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'ARCHIVED', label: 'Archived' },
];

export function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch { return `${amount} ${currency}`; }
}

export function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export const planToForm = (p: Plan): EditForm => ({
  productId: p.productId, interval: p.interval,
  trialDays: String(p.trialDays), status: p.status,
});
