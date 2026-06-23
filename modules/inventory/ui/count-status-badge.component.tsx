'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type CountStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

const VARIANT_MAP: Record<CountStatus, 'neutral' | 'warning' | 'success'> = {
  OPEN: 'neutral',
  IN_PROGRESS: 'warning',
  CLOSED: 'success',
};

const LABEL_MAP: Record<CountStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  CLOSED: 'Closed',
};

export function CountStatusBadge({ status }: { status: string }) {
  const s = (status as CountStatus) in VARIANT_MAP ? (status as CountStatus) : 'OPEN';
  return <Badge variant={VARIANT_MAP[s]} dot>{LABEL_MAP[s]}</Badge>;
}
