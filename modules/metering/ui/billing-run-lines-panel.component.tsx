'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';

type UsageEventRow = {
  usageEventId: string;
  meterKey: string;
  subjectType: string;
  subjectId: string | null;
  quantity: string;
  occurredAt: string;
  periodKey: string;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = { tenantId: string; runId: string };

/**
 * Read-only usage-event lines for a billing run. Usage is append-only, so this
 * panel only lists the immutable events the run was computed from — there is no
 * add / edit / delete (mirrors the order lines panel sans the mutating actions).
 */
export function BillingRunLinesPanel({ tenantId, runId }: Props) {
  const [rows, setRows] = useState<UsageEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const base = `/tenant/${tenantId}/api/metering/runs/${runId}/lines`;

  const fetchLines = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: 0, pageSize: 200 } });
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load usage events.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchLines(); }, [fetchLines]);

  const columns: TableColumn<UsageEventRow>[] = [
    { key: 'meterKey', header: 'Meter', render: (r) => <span className="font-mono text-text-primary">{r.meterKey}</span> },
    {
      key: 'subjectType', header: 'Subject',
      render: (r) => <span className="text-text-secondary">{r.subjectType}{r.subjectId ? `: ${r.subjectId.slice(0, 8)}…` : ''}</span>,
    },
    { key: 'quantity', header: 'Quantity', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{r.quantity}</span> },
    { key: 'occurredAt', header: 'Occurred', render: (r) => <span className="text-text-secondary">{new Date(r.occurredAt).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-4">
      {fetchError && <AlertBanner variant="error" message={fetchError} />}
      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.usageEventId}
        page={1}
        totalPages={1}
        total={rows.length}
        onPageChange={() => {}}
        hidePagination
        loading={loading}
        emptyMessage="No usage events for this run's subject and period."
      />
    </div>
  );
}
