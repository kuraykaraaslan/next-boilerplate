'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { SubscriptionStatusBadge } from '@kuraykaraaslan/payment_subscription/ui/subscription-status-badge.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type SubscriptionRow = {
  subscriptionId: string;
  planId: string;
  provider: string;
  status: string;
  billingCycle: string;
  amount: number;
  currency: string;
  currentPeriodEnd?: string | null;
};

type SubForm = { planId: string; provider: string };
const EMPTY_FORM: SubForm = { planId: '', provider: 'STRIPE' };
const STATUS_OPTIONS = ['', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'INCOMPLETE']
  .map((s) => ({ value: s, label: s || 'All statuses' }));
const PROVIDER_OPTIONS = ['STRIPE', 'PAYPAL', 'IYZICO'].map((s) => ({ value: s, label: s }));
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function fmtAmount(n: number, currency?: string | null) {
  const v = Number(n) || 0;
  if (!currency) return v.toFixed(2);
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v); }
  catch { return `${v.toFixed(2)} ${currency}`; }
}

export default function SubscriptionsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SubForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number, s: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/subscriptions`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, status: s || undefined },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load subscriptions.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page, status); }, [page, status, fetchRows]);

  function openCreate() { setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }

  async function handleSave() {
    setSaving(true); setFormError('');
    try {
      await api.post(`/tenant/${tenantId}/api/subscriptions`, { planId: form.planId, provider: form.provider });
      toast.success('Subscription created');
      setModalOpen(false);
      fetchRows(page, status);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create subscription.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(o: SubscriptionRow) {
    if (!window.confirm('Delete this subscription? This cannot be undone.')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/subscriptions/${o.subscriptionId}`);
      toast.success('Subscription deleted');
      fetchRows(page, status);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete subscription.'));
    }
  }

  const columns: TableColumn<SubscriptionRow>[] = [
    { key: 'subscriptionId', header: 'Subscription', render: (o) => <span className="font-mono text-xs text-text-primary">{o.subscriptionId.slice(0, 8)}</span> },
    { key: 'provider', header: 'Provider', render: (o) => <span className="text-text-secondary">{o.provider}</span> },
    { key: 'billingCycle', header: 'Cycle', render: (o) => <span className="text-text-secondary">{o.billingCycle}</span> },
    { key: 'status', header: 'Status', render: (o) => <SubscriptionStatusBadge status={o.status} size="sm" dot /> },
    { key: 'amount', header: 'Recurring', align: 'right', render: (o) => <span className="tabular-nums text-text-primary">{fmtAmount(o.amount, o.currency)}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (o) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Open', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => router.push(`/tenant/${tenantId}/admin/subscriptions/${o.subscriptionId}`) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(o) },
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
        actions={[
          { label: <><FontAwesomeIcon icon={faPlus} /> New Subscription</>, onClick: openCreate },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(o) => o.subscriptionId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(o) => router.push(`/tenant/${tenantId}/admin/subscriptions/${o.subscriptionId}`)}
        loading={loading}
        emptyMessage="No subscriptions yet."
        toolbar={
          <div className="pb-4 max-w-xs">
            <Select
              id="sub-status-filter"
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Subscription"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.planId}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="sub-plan" label="Plan ID" required value={form.planId}
            prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
            onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))} />
          <Select id="sub-provider" label="Provider" options={PROVIDER_OPTIONS}
            value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
