'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

const VARIANT_MAP: Record<PurchaseOrderStatus, 'neutral' | 'info' | 'success' | 'error'> = {
  DRAFT: 'neutral',
  ORDERED: 'info',
  RECEIVED: 'success',
  CANCELLED: 'error',
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus | string }) {
  const variant = VARIANT_MAP[status as PurchaseOrderStatus] ?? 'neutral';
  return <Badge variant={variant} dot>{status}</Badge>;
}
