'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const meta: Record<FormStatus, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' | 'info' }> = {
  DRAFT:     { label: 'Draft',     variant: 'warning' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  ARCHIVED:  { label: 'Archived',  variant: 'neutral' },
};

type Props = { status: FormStatus | string; size?: 'sm' | 'md' | 'lg'; dot?: boolean };

export function FormStatusBadge({ status, size = 'md', dot = false }: Props) {
  const m = meta[status as FormStatus] ?? { label: String(status), variant: 'neutral' as const };
  return <Badge variant={m.variant} size={size} dot={dot}>{m.label}</Badge>;
}
