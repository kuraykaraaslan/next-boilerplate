'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { SubscriptionStatusBadge } from '@kuraykaraaslan/payment_subscription/ui/subscription-status-badge.component';

type EventRow = {
  eventId: string;
  status: string;
  action: string;
  note?: string | null;
  createdAt: string;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = { tenantId: string; subscriptionId: string };

export function SubscriptionEventsPanel({ tenantId, subscriptionId }: Props) {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/subscriptions/${subscriptionId}/events`);
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load events.'));
    } finally { setLoading(false); }
  }, [tenantId, subscriptionId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const columns: TableColumn<EventRow>[] = [
    { key: 'action', header: 'Action', render: (r) => <span className="font-medium text-text-primary">{r.action}</span> },
    { key: 'status', header: 'Status', render: (r) => <SubscriptionStatusBadge status={r.status} size="sm" dot /> },
    { key: 'note', header: 'Note', render: (r) => <span className="text-text-secondary">{r.note ?? '—'}</span> },
    { key: 'createdAt', header: 'When', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-4">
      {fetchError && <AlertBanner variant="error" message={fetchError} />}
      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.eventId}
        page={1}
        totalPages={1}
        total={rows.length}
        onPageChange={() => {}}
        hidePagination
        loading={loading}
        emptyMessage="No lifecycle events yet."
      />
    </div>
  );
}
