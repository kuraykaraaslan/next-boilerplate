export type Provider = 'STRIPE' | 'PAYPAL' | 'IYZICO';

export const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  ACTIVE: 'success', TRIALING: 'neutral', PAST_DUE: 'warning', EXPIRED: 'error', CANCELLED: 'neutral',
};

export const INTERVAL_LABEL: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly',
};

const INTERVAL_SHORT: Record<string, string> = {
  DAILY: 'day', WEEKLY: 'wk', MONTHLY: 'mo', QUARTERLY: 'qtr', YEARLY: 'yr',
};

export function intervalLabel(v: string) { return INTERVAL_LABEL[v] ?? v; }
export function intervalShortLabel(v: string) { return INTERVAL_SHORT[v] ?? v.toLowerCase(); }

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatPrice(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
