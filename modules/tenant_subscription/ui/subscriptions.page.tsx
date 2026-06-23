'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { SubscriptionStatusBadge } from '@kuraykaraaslan/tenant_subscription/ui/subscription-status-badge.component';
import { intervalLabel, formatDate } from '@kuraykaraaslan/tenant_subscription/ui/subscription.helpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

type SubscriptionRow = {
  subscriptionId: string;
  planId: string;
  status: string;
  billingInterval: string;
  currentPeriodEnd: string | Date;
};

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

const PAGE_SIZE = 50;

export default function SubscriptionsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/subscription/admin`);
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load subscriptions.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const open = (s: SubscriptionRow) => router.push(`/tenant/${tenantId}/admin/subscription/${s.subscriptionId}`);

  const columns: TableColumn<SubscriptionRow>[] = [
    { key: 'planId', header: 'Plan', render: (s) => <span className="font-mono text-xs text-text-primary">{s.planId.slice(0, 8)}…</span> },
    { key: 'status', header: 'Status', render: (s) => <SubscriptionStatusBadge status={s.status} size="sm" /> },
    { key: 'billingInterval', header: 'Interval', render: (s) => <span className="text-text-secondary">{intervalLabel(s.billingInterval)}</span> },
    { key: 'currentPeriodEnd', header: 'Expires', render: (s) => <span className="text-text-secondary">{formatDate(s.currentPeriodEnd)}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Open', icon: <FontAwesomeIcon icon={faArrowUpRightFromSquare} />, onClick: () => open(s) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle={loading ? '…' : `${total} subscription${total !== 1 ? 's' : ''}`}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(s) => s.subscriptionId}
        page={1}
        totalPages={1}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={() => {}}
        onRowClick={open}
        loading={loading}
        emptyMessage="No subscriptions yet."
      />
    </div>
  );
}
