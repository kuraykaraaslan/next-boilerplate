'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type PayslipStatus = 'DRAFT' | 'ISSUED' | 'PAID';
export type RunStatus = 'DRAFT' | 'PROCESSED' | 'PAID';

type Variant = 'warning' | 'success' | 'neutral' | 'info' | 'primary';

const payslipMeta: Record<PayslipStatus, { label: string; variant: Variant }> = {
  DRAFT:  { label: 'Draft',  variant: 'warning' },
  ISSUED: { label: 'Issued', variant: 'info'    },
  PAID:   { label: 'Paid',   variant: 'success' },
};

const runMeta: Record<RunStatus, { label: string; variant: Variant }> = {
  DRAFT:     { label: 'Draft',     variant: 'warning' },
  PROCESSED: { label: 'Processed', variant: 'info'    },
  PAID:      { label: 'Paid',      variant: 'success' },
};

export function PayslipStatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const meta = payslipMeta[status as PayslipStatus] ?? { label: status, variant: 'neutral' as Variant };
  return <Badge variant={meta.variant} size={size}>{meta.label}</Badge>;
}

export function RunStatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const meta = runMeta[status as RunStatus] ?? { label: status, variant: 'neutral' as Variant };
  return <Badge variant={meta.variant} size={size}>{meta.label}</Badge>;
}
