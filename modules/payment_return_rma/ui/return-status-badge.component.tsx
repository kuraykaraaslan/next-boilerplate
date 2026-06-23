'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type ReturnStatus =
  | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED' | 'COMPLETED' | 'CANCELLED';

const meta: Record<ReturnStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' | 'info' }> = {
  REQUESTED: { label: 'Requested', variant: 'warning' },
  APPROVED:  { label: 'Approved',  variant: 'info'    },
  RECEIVED:  { label: 'Received',  variant: 'info'    },
  REFUNDED:  { label: 'Refunded',  variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  REJECTED:  { label: 'Rejected',  variant: 'error'   },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
};

type Props = { status: ReturnStatus | string; size?: 'sm' | 'md' | 'lg'; dot?: boolean };

export function ReturnStatusBadge({ status, size = 'md', dot = false }: Props) {
  const m = meta[status as ReturnStatus] ?? { label: String(status), variant: 'neutral' as const };
  return <Badge variant={m.variant} size={size} dot={dot}>{m.label}</Badge>;
}
