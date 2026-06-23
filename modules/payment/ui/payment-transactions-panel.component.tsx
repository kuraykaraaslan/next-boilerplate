'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

type TxRow = {
  transactionId: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  createdAt: string;
};

const txStatusVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  COMPLETED: 'success', PENDING: 'warning', PROCESSING: 'warning', FAILED: 'error', CANCELLED: 'neutral',
};

const TYPE_OPTIONS = ['PAYMENT', 'REFUND', 'CHARGEBACK', 'PAYOUT'].map((v) => ({ value: v, label: v }));
const STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'].map((v) => ({ value: v, label: v }));

type TxForm = { type: string; amount: string; status: string };
const EMPTY: TxForm = { type: 'PAYMENT', amount: '0', status: 'COMPLETED' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  paymentId: string;
  provider: string;
  currency: string;
  onRefresh: () => void;
};

export function PaymentTransactionsPanel({ tenantId, paymentId, provider, currency, onRefresh }: Props) {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TxForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const base = `/tenant/${tenantId}/api/payments/${paymentId}/transactions`;

  const fetchTx = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: 0, pageSize: 200 } });
      setRows(res.data.transactions ?? res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load transactions.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  function openCreate() { setEditId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(r: TxRow) {
    setEditId(r.transactionId);
    setForm({ type: r.type, amount: String(r.amount), status: r.status });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    try {
      if (editId) {
        await api.patch(`${base}/${editId}`, { status: form.status });
        toast.success('Transaction updated');
      } else {
        await api.post(base, { provider, type: form.type, amount: Number(form.amount) || 0, currency });
        toast.success('Transaction added');
      }
      setModalOpen(false);
      await fetchTx();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save transaction.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: TxRow) {
    if (!confirm(`Remove ${r.type} transaction?`)) return;
    try {
      await api.delete(`${base}/${r.transactionId}`);
      toast.success('Transaction removed');
      await fetchTx();
      onRefresh();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to remove transaction.'));
    }
  }

  function fmt(n: number) {
    const v = Number(n) || 0;
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v); }
    catch { return `${v.toFixed(2)} ${currency}`; }
  }

  const columns: TableColumn<TxRow>[] = [
    { key: 'type', header: 'Type', render: (r) => <Badge variant="neutral" size="sm">{r.type}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={txStatusVariant[r.status] ?? 'neutral'} dot size="sm">{r.status}</Badge> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="tabular-nums font-medium text-text-primary">{fmt(Number(r.amount))}</span> },
    { key: 'provider', header: 'Provider', render: (r) => <span className="text-text-secondary">{r.provider}</span> },
    { key: 'createdAt', header: 'Date', render: (r) => <span className="text-text-secondary">{new Date(r.createdAt).toLocaleString()}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(r) },
            { label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-4">
        {fetchError && <AlertBanner variant="error" message={fetchError} />}
        <ServerDataTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.transactionId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No transactions recorded."
          headerRight={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} /> Add Transaction
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Transaction' : 'Add Transaction'}
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          {editId ? (
            <Select id="tx-status" label="Status" options={STATUS_OPTIONS}
              value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          ) : (
            <>
              <Select id="tx-type" label="Type" options={TYPE_OPTIONS}
                value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
              <Input id="tx-amount" label="Amount" type="number" required value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
