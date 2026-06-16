'use client';
import { Badge } from '@nb/common/ui/Badge';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';
export type BundleStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'SCHEDULED';

const productMeta: Record<ProductStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' }> = {
  DRAFT:        { label: 'Draft',        variant: 'warning' },
  ACTIVE:       { label: 'Active',       variant: 'success' },
  ARCHIVED:     { label: 'Archived',     variant: 'neutral' },
  OUT_OF_STOCK: { label: 'Out of Stock', variant: 'error'   },
};

const bundleMeta: Record<BundleStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'info' }> = {
  DRAFT:     { label: 'Draft',     variant: 'warning' },
  ACTIVE:    { label: 'Active',    variant: 'success' },
  ARCHIVED:  { label: 'Archived',  variant: 'neutral' },
  SCHEDULED: { label: 'Scheduled', variant: 'info'    },
};

type ProductProps = { status: ProductStatus; size?: 'sm' | 'md' | 'lg'; dot?: boolean };
type BundleProps  = { status: BundleStatus;  size?: 'sm' | 'md' | 'lg'; dot?: boolean };

export function ProductStatusBadge({ status, size = 'md', dot = false }: ProductProps) {
  const meta = productMeta[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant} size={size} dot={dot}>{meta.label}</Badge>;
}

export function BundleStatusBadge({ status, size = 'md', dot = false }: BundleProps) {
  const meta = bundleMeta[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant} size={size} dot={dot}>{meta.label}</Badge>;
}

export function StockBadge({ qty }: { qty?: number | null }) {
  if (qty == null) return <span className="text-text-secondary text-xs">—</span>;
  if (qty === 0)   return <Badge variant="error"   size="sm">Out of stock</Badge>;
  if (qty <= 5)    return <Badge variant="warning" size="sm">{qty} left</Badge>;
  return <Badge variant="success" size="sm">{qty} in stock</Badge>;
}
