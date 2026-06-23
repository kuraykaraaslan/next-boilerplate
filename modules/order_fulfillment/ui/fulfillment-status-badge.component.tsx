'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type FulfillmentStatus =
  | 'PENDING' | 'PROCESSING' | 'BACKORDERED' | 'PACKED' | 'SHIPPED'
  | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';

const meta: Record<FulfillmentStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' | 'info' }> = {
  PENDING:     { label: 'Pending',     variant: 'warning' },
  PROCESSING:  { label: 'Processing',  variant: 'info'    },
  BACKORDERED: { label: 'Backordered', variant: 'warning' },
  PACKED:      { label: 'Packed',      variant: 'info'    },
  SHIPPED:     { label: 'Shipped',     variant: 'info'    },
  IN_TRANSIT:  { label: 'In Transit',  variant: 'info'    },
  DELIVERED:   { label: 'Delivered',   variant: 'success' },
  CANCELLED:   { label: 'Cancelled',   variant: 'neutral' },
  RETURNED:    { label: 'Returned',    variant: 'error'   },
};

type Props = { status: FulfillmentStatus | string; size?: 'sm' | 'md' | 'lg'; dot?: boolean };

export function FulfillmentStatusBadge({ status, size = 'md', dot = false }: Props) {
  const m = meta[status as FulfillmentStatus] ?? { label: String(status), variant: 'neutral' as const };
  return <Badge variant={m.variant} size={size} dot={dot}>{m.label}</Badge>;
}
