'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { Badge } from '@/modules_next/common/ui/Badge';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';

type ApprovalItem = {
  approvalItemId: string;
  entityType: string;
  entityId: string;
  submittedByUserId: string | null;
  status: string;
  priority: number;
  reason: string | null;
  decisionNote: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  slaDueAt: string | null;
  createdAt: string;
};

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary'> = {
  PENDING: 'warning',
  IN_REVIEW: 'info',
  ESCALATED: 'primary',
  APPROVED: 'success',
  REJECTED: 'error',
};

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

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const [active, setActive] = useState<ApprovalItem | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/back-office/approvals`, {
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

  async function act(item: ApprovalItem, action: 'claim' | 'decide', decision?: string) {
    setBusy(true);
    try {
      await api.patch(`/tenant/${tenantId}/api/back-office/approvals/${item.approvalItemId}`, {
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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-overlay text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Entity type</th>
              <th className="px-3 py-2 text-left font-medium">Entity</th>
              <th className="px-3 py-2 text-right font-medium">Priority</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">SLA due</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-text-secondary">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-text-secondary">No items in this view.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.approvalItemId} className="border-t border-border">
                  <td className="px-3 py-2 text-text-primary">{it.entityType}</td>
                  <td className="px-3 py-2 text-text-secondary font-mono text-xs">{it.entityId}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-primary">{it.priority}</td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANT[it.status] ?? 'neutral'}>{it.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {it.slaDueAt ? new Date(it.slaDueAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setActive(it); setNote(it.decisionNote ?? ''); }}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
