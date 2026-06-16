'use client';

import { Button } from '@nb/common/ui/button.component';
import { Badge } from '@nb/common/ui/badge.component';
import type { TableColumn } from '@nb/common/ui/server-data-table.component';

export type TicketRow = {
  ticketId: string;
  ticketNumber: string;
  requesterEmail: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  assignedToUserId: string | null;
  createdAt: string;
};

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary'> = {
  OPEN: 'warning',
  PENDING: 'info',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const PRIORITY_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary'> = {
  LOW: 'neutral',
  NORMAL: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};

export { STATUS_VARIANT as TICKET_STATUS_VARIANT, PRIORITY_VARIANT as TICKET_PRIORITY_VARIANT };

export function buildTicketColumns(onOpen: (ticket: TicketRow) => void): TableColumn<TicketRow>[] {
  return [
    {
      key: 'ticketNumber',
      header: 'Number',
      render: (t) => <span className="font-mono text-xs text-text-primary">{t.ticketNumber}</span>,
    },
    { key: 'subject', header: 'Subject', render: (t) => <span className="text-text-primary">{t.subject}</span> },
    { key: 'requesterEmail', header: 'Requester', render: (t) => <span className="text-text-secondary">{t.requesterEmail}</span> },
    {
      key: 'priority',
      header: 'Priority',
      render: (t) => <Badge variant={PRIORITY_VARIANT[t.priority] ?? 'neutral'}>{t.priority}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <Badge variant={STATUS_VARIANT[t.status] ?? 'neutral'}>{t.status}</Badge>,
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (t) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => onOpen(t)}>View</Button>
        </div>
      ),
    },
  ];
}
