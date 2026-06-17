'use client';

import { Button } from '@kuraykaraaslan/common/ui/button.component';
import type { TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import type { SafeInvoice } from '@kuraykaraaslan/invoice/server/invoice.types';

export type InvoiceRow = Pick<
  SafeInvoice,
  'invoiceId' | 'invoiceNumber' | 'customerName' | 'customerEmail' | 'totalAmount' | 'currency' | 'status' | 'region' | 'earsivStatus' | 'earsivUuid'
> & { issueDate: string };

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-text-secondary/10 text-text-secondary',
  issued: 'bg-info-subtle text-info-fg',
  paid: 'bg-success-subtle text-success-fg',
  void: 'bg-error-subtle text-error-fg',
  refunded: 'bg-warning-subtle text-warning-fg',
};

const EARSIV_LABEL: Record<string, string> = {
  submitted: 'e-Arşiv · awaiting signature',
  accepted: 'e-Arşiv · signed',
  rejected: 'e-Arşiv · rejected',
};

type Handlers = {
  busyId: string | null;
  onGenerate: (invoiceId: string) => void;
  onOpen: (invoiceId: string) => void;
};

export function buildInvoiceColumns(h: Handlers): TableColumn<InvoiceRow>[] {
  return [
    {
      key: 'invoiceNumber',
      header: 'Number',
      render: (inv) => <span className="font-mono text-xs text-text-primary">{inv.invoiceNumber}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (inv) => (
        <div className="min-w-0">
          <div className="font-medium text-text-primary">{inv.customerName}</div>
          <div className="text-xs text-text-secondary">{inv.customerEmail}</div>
        </div>
      ),
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      render: (inv) => <span className="text-xs text-text-secondary">{new Date(inv.issueDate).toLocaleDateString()}</span>,
    },
    {
      key: 'region',
      header: 'Region',
      render: (inv) => <span className="text-xs text-text-secondary">{inv.region}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'right',
      render: (inv) => (
        <span className="font-mono tabular-nums text-text-primary">
          {inv.totalAmount.toFixed(2)} {inv.currency}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => (
        <div>
          <span className={`rounded-md px-2 py-0.5 text-xs ${STATUS_COLOR[inv.status] ?? ''}`}>{inv.status}</span>
          {inv.region === 'TR' && inv.earsivStatus && (
            <div className="mt-1 text-[11px] text-text-secondary">
              {EARSIV_LABEL[inv.earsivStatus] ?? `e-Arşiv: ${inv.earsivStatus}`}
            </div>
          )}
        </div>
      ),
    },
    {
      key: '_actions',
      header: '',
      align: 'right',
      render: (inv) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {inv.status === 'draft' && (
            <Button
              size="sm"
              variant="secondary"
              loading={h.busyId === inv.invoiceId}
              onClick={() => h.onGenerate(inv.invoiceId)}
            >
              {inv.region === 'TR' ? 'Issue e-Arşiv' : 'Issue'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => h.onOpen(inv.invoiceId)}>
            Open
          </Button>
        </div>
      ),
    },
  ];
}
