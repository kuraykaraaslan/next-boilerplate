'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';

type Line = {
  lineId: string;
  accountId: string;
  debit?: number | null;
  credit?: number | null;
  memo?: string | null;
  createdAt: string;
};

const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}
function fmtAmount(v?: number | null) {
  if (v === null || v === undefined) return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  return isNaN(n) ? '—' : n.toFixed(2);
}

export default function AccountingLedgerPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<Line[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/tenant/${tenantId}/api/accounting/ledger`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load ledger.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  const columns: TableColumn<Line>[] = [
    { key: 'accountId', header: 'Account', render: (r) => <span className="font-mono text-xs text-text-secondary">{r.accountId}</span> },
    { key: 'debit', header: 'Debit', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{fmtAmount(r.debit)}</span> },
    { key: 'credit', header: 'Credit', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{fmtAmount(r.credit)}</span> },
    { key: 'memo', header: 'Memo', render: (r) => <span className="text-text-secondary">{r.memo ?? '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        subtitle={loading ? '…' : `${total} line${total !== 1 ? 's' : ''}`}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/accounting/ledger/settings`, variant: 'ghost' as const },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.lineId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No ledger lines yet."
      />
    </div>
  );
}
