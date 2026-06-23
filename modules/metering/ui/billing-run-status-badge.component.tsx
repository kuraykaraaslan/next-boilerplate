'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type BillingRunStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'DRAFT'
  | 'CALCULATED'
  | 'BILLED';

const meta: Record<BillingRunStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' | 'info' }> = {
  DRAFT:      { label: 'Draft',      variant: 'warning' },
  CALCULATED: { label: 'Calculated', variant: 'info'    },
  BILLED:     { label: 'Billed',     variant: 'success' },
  PENDING:    { label: 'Pending',    variant: 'warning' },
  COMPLETED:  { label: 'Completed',  variant: 'success' },
  FAILED:     { label: 'Failed',     variant: 'error'   },
};

type Props = { status: BillingRunStatus | string; size?: 'sm' | 'md' | 'lg'; dot?: boolean };

export function BillingRunStatusBadge({ status, size = 'md', dot = false }: Props) {
  const m = meta[status as BillingRunStatus] ?? { label: String(status), variant: 'neutral' as const };
  return <Badge variant={m.variant} size={size} dot={dot}>{m.label}</Badge>;
}
