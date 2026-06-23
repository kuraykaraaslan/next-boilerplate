'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SPAM';

const meta: Record<ReviewStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' | 'info' }> = {
  PENDING:  { label: 'Pending',  variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'neutral' },
  SPAM:     { label: 'Spam',     variant: 'error'   },
};

type Props = { status: ReviewStatus | string; size?: 'sm' | 'md' | 'lg'; dot?: boolean };

export function ReviewStatusBadge({ status, size = 'md', dot = false }: Props) {
  const m = meta[status as ReviewStatus] ?? { label: String(status), variant: 'neutral' as const };
  return <Badge variant={m.variant} size={size} dot={dot}>{m.label}</Badge>;
}
