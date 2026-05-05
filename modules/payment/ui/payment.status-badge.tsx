'use client';
// Adapted from next_components: modules/domains/common/payment/PaymentStatusBadge.tsx
import { Badge } from '@/modules/ui/Badge';

export type PaymentStatus =
  | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED' | 'EXPIRED';

const statusMeta: Record<PaymentStatus, { label: string; variant: 'warning' | 'info' | 'success' | 'error' | 'neutral' }> = {
  PENDING:           { label: 'Pending',           variant: 'warning' },
  PROCESSING:        { label: 'Processing',         variant: 'info' },
  COMPLETED:         { label: 'Completed',          variant: 'success' },
  FAILED:            { label: 'Failed',             variant: 'error' },
  REFUNDED:          { label: 'Refunded',           variant: 'info' },
  PARTIALLY_REFUNDED:{ label: 'Partially Refunded', variant: 'warning' },
  CANCELLED:         { label: 'Cancelled',          variant: 'neutral' },
  EXPIRED:           { label: 'Expired',            variant: 'neutral' },
};

type Props = { status: PaymentStatus; size?: 'sm' | 'md' | 'lg'; dot?: boolean };

export function PaymentStatusBadge({ status, size = 'md', dot = false }: Props) {
  const meta = statusMeta[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant} size={size} dot={dot}>{meta.label}</Badge>;
}
