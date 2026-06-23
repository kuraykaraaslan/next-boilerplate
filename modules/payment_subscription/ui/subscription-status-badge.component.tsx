'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type SubscriptionStatus =
  | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'PAUSED'
  | 'CANCELLED' | 'EXPIRED' | 'INCOMPLETE';

const meta: Record<SubscriptionStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' | 'info' }> = {
  TRIALING:   { label: 'Trialing',   variant: 'info'    },
  ACTIVE:     { label: 'Active',     variant: 'success' },
  PAST_DUE:   { label: 'Past Due',   variant: 'warning' },
  PAUSED:     { label: 'Paused',     variant: 'warning' },
  CANCELLED:  { label: 'Cancelled',  variant: 'neutral' },
  EXPIRED:    { label: 'Expired',    variant: 'error'   },
  INCOMPLETE: { label: 'Incomplete', variant: 'neutral' },
};

type Props = { status: SubscriptionStatus | string; size?: 'sm' | 'md' | 'lg'; dot?: boolean };

export function SubscriptionStatusBadge({ status, size = 'md', dot = false }: Props) {
  const m = meta[status as SubscriptionStatus] ?? { label: String(status), variant: 'neutral' as const };
  return <Badge variant={m.variant} size={size} dot={dot}>{m.label}</Badge>;
}
