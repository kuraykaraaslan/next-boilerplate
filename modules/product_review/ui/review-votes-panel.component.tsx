'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';

type VoteRow = {
  voteId: string;
  userId: string;
  isHelpful: boolean;
  createdAt: string;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = { tenantId: string; reviewId: string };

export function ReviewVotesPanel({ tenantId, reviewId }: Props) {
  const [rows, setRows] = useState<VoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchVotes = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/reviews/${reviewId}/votes`, {
        params: { page: 0, pageSize: 200 },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load votes.'));
    } finally { setLoading(false); }
  }, [tenantId, reviewId]);

  useEffect(() => { fetchVotes(); }, [fetchVotes]);

  const columns: TableColumn<VoteRow>[] = [
    { key: 'userId', header: 'User', render: (r) => <span className="font-mono text-xs text-text-secondary">{r.userId}</span> },
    {
      key: 'isHelpful', header: 'Vote',
      render: (r) => <Badge variant={r.isHelpful ? 'success' : 'neutral'} size="sm">{r.isHelpful ? 'Helpful' : 'Not helpful'}</Badge>,
    },
    {
      key: 'createdAt', header: 'When', align: 'right',
      render: (r) => <span className="text-text-secondary">{new Date(r.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {fetchError && <AlertBanner variant="error" message={fetchError} />}
      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.voteId}
        page={1}
        totalPages={1}
        total={total}
        onPageChange={() => {}}
        hidePagination
        loading={loading}
        emptyMessage="No votes recorded for this review yet."
      />
    </div>
  );
}
