'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@kuraykaraaslan/common/server/axios';
import { ReturnStatusBadge } from '@kuraykaraaslan/payment_return_rma/ui/return-status-badge.component';
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
import { faPlus, faSearch, faPenToSquare, faTrash, faGear } from '@fortawesome/free-solid-svg-icons';

type ReturnRow = {
  returnRequestId: string;
  rmaNumber: string;
  orderId: string;
  status: string;
  type: string;
  refundAmount?: number | null;
  currency?: string | null;
  createdAt: string;
};

type Form = { orderId: string; type: string; reason: string; itemName: string; quantity: string; unitPrice: string };
const EMPTY_FORM: Form = { orderId: '', type: 'RETURN', reason: '', itemName: '', quantity: '1', unitPrice: '0' };
const TYPE_OPTIONS = ['RETURN', 'EXCHANGE', 'REFUND'].map((v) => ({ value: v, label: v }));
const STATUS_OPTIONS = [{ value: '', label: 'All statuses' },
  ...['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'COMPLETED', 'CANCELLED'].map((s) => ({ value: s, label: s }))];
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function ReturnsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/tenant/${tenantId}/api/returns`;

  const fetchRows = useCallback(async (p: number, q: string, st: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined, status: st || undefined },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load returns.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchRows(page, search, status); }, [page, search, status, fetchRows]);

  function openCreate() { setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }

  async function handleCreate() {
    setSaving(true); setFormError('');
    const payload = {
      orderId: form.orderId,
      type: form.type,
      reason: form.reason || undefined,
      items: [{
        name: form.itemName || 'Returned item',
        quantity: Number(form.quantity) || 1,
        unitPrice: Number(form.unitPrice) || 0,
      }],
    };
    try {
      const res = await api.post(base, payload);
      toast.success('Return created');
      setModalOpen(false);
      const id = res.data?.item?.returnRequestId;
      if (id) router.push(`/tenant/${tenantId}/admin/returns/${id}`);
      else fetchRows(page, search, status);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to create return.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: ReturnRow) {
    if (!window.confirm(`Cancel return "${r.rmaNumber}"?`)) return;
    try {
      await api.post(`${base}/${r.returnRequestId}/cancel`, {});
      toast.success('Return cancelled');
      fetchRows(page, search, status);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to cancel return.'));
    }
  }

  function fmt(n?: number | null, currency?: string | null) {
    const v = Number(n) || 0;
    if (!currency) return v.toFixed(2);
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v); }
    catch { return `${v.toFixed(2)} ${currency}`; }
  }

  const columns: TableColumn<ReturnRow>[] = [
    { key: 'rmaNumber', header: 'RMA', render: (r) => <span className="font-medium text-text-primary">{r.rmaNumber}</span> },
    { key: 'type', header: 'Type', render: (r) => <span className="text-text-secondary">{r.type}</span> },
    { key: 'status', header: 'Status', render: (r) => <ReturnStatusBadge status={r.status} size="sm" dot /> },
    { key: 'refundAmount', header: 'Refund', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{fmt(r.refundAmount, r.currency)}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Open', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => router.push(`/tenant/${tenantId}/admin/returns/${r.returnRequestId}`) },
            { label: 'Cancel', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns (RMA)"
        subtitle={loading ? '…' : `${total} return${total !== 1 ? 's' : ''}`}
        actions={[
          { label: <FontAwesomeIcon icon={faGear} />, href: `/tenant/${tenantId}/admin/returns/settings`, variant: 'ghost' as const },
          { label: <><FontAwesomeIcon icon={faPlus} /> New Return</>, onClick: openCreate },
        ]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.returnRequestId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(r) => router.push(`/tenant/${tenantId}/admin/returns/${r.returnRequestId}`)}
        loading={loading}
        emptyMessage="No returns yet. Create one to get started."
        toolbar={
          <div className="pb-4 flex gap-3">
            <div className="flex-1">
              <Input
                id="return-search"
                label="Search"
                placeholder="Filter by RMA number…"
                prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              />
            </div>
            <div className="w-48">
              <Select id="return-status-filter" label="Status" options={STATUS_OPTIONS}
                value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} />
            </div>
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Return"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={saving} disabled={!form.orderId}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="return-order" label="Order ID" required value={form.orderId}
            onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))} />
          <Select id="return-type" label="Type" options={TYPE_OPTIONS}
            value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
          <Input id="return-reason" label="Reason (optional)" value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          <p className="text-xs text-text-secondary">First returned item (add more on the detail page):</p>
          <Input id="return-item-name" label="Item name" value={form.itemName}
            onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="return-item-qty" label="Quantity" type="number" value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="return-item-price" label="Unit Price" type="number" value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
