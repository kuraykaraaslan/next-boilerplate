'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

type Variant = 'warning' | 'success' | 'neutral' | 'error' | 'info';

const leaveMeta: Record<string, { label: string; variant: Variant }> = {
  PENDING:  { label: 'Pending',  variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'error'   },
};

const employeeMeta: Record<string, { label: string; variant: Variant }> = {
  ACTIVE:     { label: 'Active',     variant: 'success' },
  ONLEAVE:    { label: 'On Leave',   variant: 'info'    },
  TERMINATED: { label: 'Terminated', variant: 'neutral' },
};

export function LeaveStatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const meta = leaveMeta[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant} size={size}>{meta.label}</Badge>;
}

export function EmployeeStatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const meta = employeeMeta[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={meta.variant} size={size}>{meta.label}</Badge>;
}
