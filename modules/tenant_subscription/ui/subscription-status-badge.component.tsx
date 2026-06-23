'use client';

import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { STATUS_VARIANT } from './subscription.helpers';

const LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  TRIALING: 'Trial',
  PAST_DUE: 'Grace',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export function SubscriptionStatusBadge({
  status,
  size = 'md',
  dot = true,
}: {
  status: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} dot={dot} size={size}>
      {LABEL[status] ?? status}
    </Badge>
  );
}
