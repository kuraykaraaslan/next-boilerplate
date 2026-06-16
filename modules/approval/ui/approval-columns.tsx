'use client';

import { Button } from '@nb/common/ui/Button';
import { Badge } from '@nb/common/ui/Badge';
import type { TableColumn } from '@nb/common/ui/ServerDataTable';

export type ApprovalRow = {
  approvalItemId: string;
  entityType: string;
  entityId: string;
  submittedByUserId: string | null;
  status: string;
  priority: number;
  reason: string | null;
  decisionNote: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  slaDueAt: string | null;
  createdAt: string;
};

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary'> = {
  PENDING: 'warning',
  IN_REVIEW: 'info',
  ESCALATED: 'primary',
  APPROVED: 'success',
  REJECTED: 'error',
};

export function buildApprovalColumns(onReview: (item: ApprovalRow) => void): TableColumn<ApprovalRow>[] {
  return [
    { key: 'entityType', header: 'Entity type', render: (it) => <span className="text-text-primary">{it.entityType}</span> },
    {
      key: 'entityId',
      header: 'Entity',
      render: (it) => <span className="font-mono text-xs text-text-secondary">{it.entityId}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      align: 'right',
      render: (it) => <span className="tabular-nums text-text-primary">{it.priority}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (it) => <Badge variant={STATUS_VARIANT[it.status] ?? 'neutral'}>{it.status}</Badge>,
    },
    {
      key: 'slaDueAt',
      header: 'SLA due',
      render: (it) => (
        <span className="text-text-secondary">{it.slaDueAt ? new Date(it.slaDueAt).toLocaleString() : '—'}</span>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (it) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => onReview(it)}>Review</Button>
        </div>
      ),
    },
  ];
}
