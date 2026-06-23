'use client';

import { Button } from '@kuraykaraaslan/common/ui/button.component';
import type { TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { BillingRunStatusBadge } from '@kuraykaraaslan/metering/ui/billing-run-status-badge.component';

export type MeterRow = {
  meterId: string;
  key: string;
  name: string;
  unit: string;
  aggregation: string;
  unitPriceMinor: string;
  currency: string;
  includedQuantity: string;
  active: boolean;
};

export type UsageRow = {
  meterKey: string;
  name: string;
  unit: string;
  aggregation: string;
  periodKey: string;
  usedQuantity: string;
  includedQuantity: string;
  source: 'redis' | 'db';
};

export type BillingRunRow = {
  billingRunId: string;
  subjectType: string;
  subjectId: string | null;
  periodKey: string;
  status: string;
  currency: string;
  totalMinor: string;
  walletDebitedMinor: string;
  invoicedMinor: string;
  invoiceId: string | null;
  createdAt: string;
};

export function buildMeterColumns(onToggle: (meter: MeterRow) => void): TableColumn<MeterRow>[] {
  return [
    { key: 'key', header: 'Key', render: (m) => <span className="font-mono text-text-primary">{m.key}</span> },
    { key: 'name', header: 'Name', render: (m) => <span className="text-text-primary">{m.name}</span> },
    { key: 'unit', header: 'Unit', render: (m) => <span className="text-text-secondary">{m.unit}</span> },
    { key: 'aggregation', header: 'Aggregation', render: (m) => <span className="text-text-secondary">{m.aggregation}</span> },
    {
      key: 'unitPriceMinor',
      header: 'Unit price (minor)',
      align: 'right',
      render: (m) => <span className="tabular-nums text-text-primary">{m.unitPriceMinor}</span>,
    },
    {
      key: 'includedQuantity',
      header: 'Included',
      align: 'right',
      render: (m) => <span className="tabular-nums text-text-secondary">{m.includedQuantity}</span>,
    },
    { key: 'currency', header: 'Currency', render: (m) => <span className="text-text-primary">{m.currency}</span> },
    {
      key: '_active',
      header: 'Active',
      align: 'right',
      render: (m) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => onToggle(m)}>{m.active ? 'Active' : 'Inactive'}</Button>
        </div>
      ),
    },
  ];
}

export function buildUsageColumns(): TableColumn<UsageRow>[] {
  return [
    {
      key: 'name',
      header: 'Meter',
      render: (u) => (
        <span className="text-text-primary">
          {u.name} <span className="text-text-secondary font-mono">({u.meterKey})</span>
        </span>
      ),
    },
    { key: 'periodKey', header: 'Period', render: (u) => <span className="text-text-secondary">{u.periodKey}</span> },
    {
      key: 'usedQuantity',
      header: 'Used',
      align: 'right',
      render: (u) => <span className="tabular-nums text-text-primary">{u.usedQuantity} {u.unit}</span>,
    },
    {
      key: 'includedQuantity',
      header: 'Included',
      align: 'right',
      render: (u) => <span className="tabular-nums text-text-secondary">{u.includedQuantity}</span>,
    },
    { key: 'source', header: 'Source', render: (u) => <span className="text-text-secondary">{u.source}</span> },
  ];
}

export function buildBillingRunColumns(): TableColumn<BillingRunRow>[] {
  return [
    { key: 'periodKey', header: 'Period', render: (r) => <span className="text-text-primary">{r.periodKey}</span> },
    {
      key: 'subjectType',
      header: 'Subject',
      render: (r) => (
        <span className="text-text-secondary">
          {r.subjectType}{r.subjectId ? `: ${r.subjectId.slice(0, 8)}…` : ''}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <BillingRunStatusBadge status={r.status} size="sm" dot /> },
    {
      key: 'totalMinor',
      header: 'Total',
      align: 'right',
      render: (r) => <span className="tabular-nums text-text-primary">{r.totalMinor} {r.currency}</span>,
    },
    {
      key: 'walletDebitedMinor',
      header: 'Wallet',
      align: 'right',
      render: (r) => <span className="tabular-nums text-text-secondary">{r.walletDebitedMinor}</span>,
    },
    {
      key: 'invoicedMinor',
      header: 'Invoiced',
      align: 'right',
      render: (r) => <span className="tabular-nums text-text-secondary">{r.invoicedMinor}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (r) => <span className="text-text-secondary">{new Date(r.createdAt).toLocaleString()}</span>,
    },
  ];
}
