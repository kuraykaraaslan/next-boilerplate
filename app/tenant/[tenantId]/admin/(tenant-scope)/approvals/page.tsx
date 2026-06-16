'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@nb/common/ui/Button';
import { Input } from '@nb/common/ui/Input';
import { Select } from '@nb/common/ui/Select';
import { AlertBanner } from '@nb/common/ui/AlertBanner';
import { Modal } from '@nb/common/ui/Modal';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { ServerDataTable } from '@nb/common/ui/ServerDataTable';
import { toast } from '@nb/common/ui/toast.store';
import api from '@nb/common/server/axios';
import { buildApprovalColumns, type ApprovalRow } from '@nb/approval/ui/approval-columns';

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function ApprovalsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [items, setItems] = useState<ApprovalRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const [active, setActive] = useState<ApprovalRow | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/approvals`, {
        params: { pageSize: 100, ...(statusFilter ? { status: statusFilter } : {}) },
      });
      setItems(res.data.data ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load the approval queue.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function act(item: ApprovalRow, action: 'claim' | 'decide', decision?: string) {
    setBusy(true);
    try {
      await api.patch(`/tenant/${tenantId}/api/approvals/${item.approvalItemId}`, {
        action,
        ...(decision ? { decision } : {}),
        ...(note ? { note } : {}),
      });
      toast.success(action === 'claim' ? 'Item claimed.' : `Item ${decision?.toLowerCase()}d.`);
      setActive(null);
      setNote('');
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Action failed.'));
    } finally {
      setBusy(false);
    }
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildApprovalColumns((it) => { setActive(it); setNote(it.decisionNote ?? ''); });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader
        title="Approval queue"
        subtitle="Generic moderation queue — review, approve, reject or escalate submitted items."
        actions={[{ label: 'Refresh', variant: 'outline', onClick: fetchData }]}
      />

      <div className="max-w-xs">
        <Select
          id="status-filter"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(it) => it.approvalItemId}
        onRowClick={(it) => { setActive(it); setNote(it.decisionNote ?? ''); }}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No items in this view."
      />

      <Modal open={!!active} onClose={() => setActive(null)} title={active ? `Review — ${active.entityType}` : 'Review'}>
        {active && (
          <div className="space-y-3">
            <div className="text-sm text-text-secondary">
              <div><span className="text-text-primary">Entity:</span> <span className="font-mono text-xs">{active.entityId}</span></div>
              <div><span className="text-text-primary">Status:</span> {active.status}</div>
              {active.reason && <div><span className="text-text-primary">Reason:</span> {active.reason}</div>}
            </div>
            <Input
              id="decision-note"
              label="Decision note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why are you approving / rejecting?"
            />
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {active.status === 'PENDING' && (
                <Button variant="outline" disabled={busy} onClick={() => act(active, 'claim')}>Claim</Button>
              )}
              {active.status !== 'APPROVED' && active.status !== 'REJECTED' && (
                <>
                  <Button variant="outline" disabled={busy} onClick={() => act(active, 'decide', 'ESCALATE')}>Escalate</Button>
                  <Button variant="danger" disabled={busy} onClick={() => act(active, 'decide', 'REJECT')}>Reject</Button>
                  <Button variant="primary" disabled={busy} onClick={() => act(active, 'decide', 'APPROVE')}>Approve</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
