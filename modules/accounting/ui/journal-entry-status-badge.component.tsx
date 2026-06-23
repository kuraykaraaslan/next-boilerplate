'use client';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';

export type EntryStatus = 'DRAFT' | 'POSTED' | 'VOID';

const VARIANT: Record<EntryStatus, 'neutral' | 'success' | 'error'> = {
  DRAFT: 'neutral',
  POSTED: 'success',
  VOID: 'error',
};

export function JournalEntryStatusBadge({ status }: { status: string }) {
  const v = VARIANT[(status as EntryStatus)] ?? 'neutral';
  return <Badge variant={v}>{status}</Badge>;
}
