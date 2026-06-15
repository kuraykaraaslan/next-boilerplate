'use client';
import { use, useState, useEffect, useCallback } from 'react';
import { Button } from '@/modules_next/common/ui/Button';
import { Input } from '@/modules_next/common/ui/Input';
import { Select } from '@/modules_next/common/ui/Select';
import { Badge } from '@/modules_next/common/ui/Badge';
import { AlertBanner } from '@/modules_next/common/ui/AlertBanner';
import { Modal } from '@/modules_next/common/ui/Modal';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { ServerDataTable } from '@/modules_next/common/ui/ServerDataTable';
import { toast } from '@/modules_next/common/ui/toast.store';
import api from '@/modules_next/common/axios';
import {
  buildTicketColumns,
  TICKET_STATUS_VARIANT as STATUS_VARIANT,
  TICKET_PRIORITY_VARIANT as PRIORITY_VARIANT,
  type TicketRow as Ticket,
} from '@/modules_next/support/ui/support-ticket-columns';

const PAGE_SIZE = 25;

type TicketMessage = {
  ticketMessageId: string;
  authorType: string;
  body: string;
  internal: boolean;
  createdAt: string;
};

type TicketDetail = Ticket & { messages: TicketMessage[] };

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

function extractMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function SupportPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/support/tickets`, {
        params: { pageSize: 100, ...(statusFilter ? { status: statusFilter } : {}) },
      });
      setTickets(res.data.data ?? []);
    } catch (err: unknown) {
      setFetchError(extractMessage(err, 'Failed to load tickets.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDetail = useCallback(async (ticketId: string) => {
    setDetailLoading(true);
    setReply('');
    setInternal(false);
    try {
      const res = await api.get(`/tenant/${tenantId}/api/support/tickets/${ticketId}`);
      setDetail(res.data.ticket);
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to load the ticket.'));
    } finally {
      setDetailLoading(false);
    }
  }, [tenantId]);

  async function sendReply() {
    if (!detail) return;
    setBusy(true);
    try {
      await api.post(`/tenant/${tenantId}/api/support/tickets/${detail.ticketId}/messages`, {
        body: reply,
        internal,
      });
      toast.success('Reply sent.');
      await openDetail(detail.ticketId);
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to send reply.'));
    } finally {
      setBusy(false);
    }
  }

  async function patch(action: string, extra: Record<string, unknown> = {}) {
    if (!detail) return;
    setBusy(true);
    try {
      await api.patch(`/tenant/${tenantId}/api/support/tickets/${detail.ticketId}`, { action, ...extra });
      toast.success('Ticket updated.');
      await openDetail(detail.ticketId);
      fetchData();
    } catch (err: unknown) {
      toast.error(extractMessage(err, 'Failed to update the ticket.'));
    } finally {
      setBusy(false);
    }
  }

  const total = tickets.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRows = tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = buildTicketColumns((t) => openDetail(t.ticketId));

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader
        title="Support tickets"
        subtitle="Customer support desk — triage, reply, assign and resolve tickets."
        actions={[{ label: 'Refresh', variant: 'outline', onClick: fetchData }]}
      />

      <div className="max-w-xs">
        <Select
          id="ticket-status-filter"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUS_FILTER_OPTIONS}
        />
      </div>

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(t) => t.ticketId}
        onRowClick={(t) => openDetail(t.ticketId)}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No tickets in this view."
      />

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.ticketNumber} — ${detail.subject}` : 'Ticket'}
      >
        {detailLoading || !detail ? (
          <div className="px-3 py-6 text-center text-text-secondary">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={STATUS_VARIANT[detail.status] ?? 'neutral'}>{detail.status}</Badge>
              <Badge variant={PRIORITY_VARIANT[detail.priority] ?? 'neutral'}>{detail.priority}</Badge>
              <span className="text-text-secondary">{detail.requesterEmail}</span>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {detail.messages.map((m) => (
                <div
                  key={m.ticketMessageId}
                  className={`rounded-md p-2 text-sm ${
                    m.internal
                      ? 'bg-warning-subtle'
                      : m.authorType === 'AGENT'
                        ? 'bg-primary-subtle'
                        : 'bg-surface-sunken'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">{m.authorType}</span>
                    {m.internal && <Badge variant="warning" size="sm">internal</Badge>}
                    <span>{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-text-primary">{m.body}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Input
                id="ticket-reply"
                label="Reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a reply…"
              />
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Internal note (hidden from the requester)
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
              <Button variant="primary" disabled={busy || !reply} onClick={sendReply}>Send reply</Button>
              {detail.status !== 'RESOLVED' && detail.status !== 'CLOSED' && (
                <Button variant="outline" disabled={busy} onClick={() => patch('resolve')}>Resolve</Button>
              )}
              {detail.status !== 'CLOSED' && (
                <Button variant="outline" disabled={busy} onClick={() => patch('close')}>Close</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
