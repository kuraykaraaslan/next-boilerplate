'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';

type SubmissionRow = {
  submissionId: string;
  formId: string;
  createdAt: string;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = { tenantId: string; formId: string };

export function FormSubmissionsPanel({ tenantId, formId }: Props) {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/form-submissions`, {
        params: { page: 0, pageSize: 200, formId },
      });
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load submissions.'));
    } finally { setLoading(false); }
  }, [tenantId, formId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const columns: TableColumn<SubmissionRow>[] = [
    {
      key: 'createdAt', header: 'Created',
      render: (r) => <span className="text-text-secondary">{new Date(r.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {fetchError && <AlertBanner variant="error" message={fetchError} />}
      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.submissionId}
        page={1}
        totalPages={1}
        total={rows.length}
        onPageChange={() => {}}
        hidePagination
        loading={loading}
        emptyMessage="No submissions yet."
      />
    </div>
  );
}
