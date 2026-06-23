'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';

const meta: Record<OrderStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' | 'info' }> = {
  DRAFT:     { label: 'Draft',     variant: 'warning' },
  CONFIRMED: { label: 'Confirmed', variant: 'info'    },
  PAID:      { label: 'Paid',      variant: 'success' },
  FULFILLED: { label: 'Fulfilled', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
  REFUNDED:  { label: 'Refunded',  variant: 'error'   },
};

type Props = { status: OrderStatus | string; size?: 'sm' | 'md' | 'lg'; dot?: boolean };

export function OrderStatusBadge({ status, size = 'md', dot = false }: Props) {
  const m = meta[status as OrderStatus] ?? { label: String(status), variant: 'neutral' as const };
  return <Badge variant={m.variant} size={size} dot={dot}>{m.label}</Badge>;
}
