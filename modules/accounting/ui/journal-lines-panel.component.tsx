'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

type Line = {
  lineId: string;
  accountId: string;
  memo?: string | null;
  debit?: number | string | null;
  credit?: number | string | null;
};

type Form = { accountId: string; memo: string; debit: string; credit: string };
const EMPTY_FORM: Form = { accountId: '', memo: '', debit: '0', credit: '0' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}
function num(v: unknown) { const n = Number(v ?? 0); return isNaN(n) ? 0 : n; }
function fmt(v: unknown) { return num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

type Props = { tenantId: string; entryId: string; onRefresh: () => void };

export function JournalLinesPanel({ tenantId, entryId, onRefresh }: Props) {
  const [rows, setRows] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const base = `/tenant/${tenantId}/api/accounting/journal/${entryId}/lines`;

  const fetchRows = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base);
      setRows(res.data.data ?? res.data.items ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load lines.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }
  function openEdit(r: Line) {
    setEditId(r.lineId);
    setForm({ accountId: r.accountId ?? '', memo: r.memo ?? '', debit: String(num(r.debit)), credit: String(num(r.credit)) });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = { accountId: form.accountId, memo: form.memo || undefined, debit: Number(form.debit) || 0, credit: Number(form.credit) || 0 };
    try {
      if (editId) await api.patch(`${base}/${editId}`, payload);
      else await api.post(base, payload);
      toast.success(editId ? 'Line updated' : 'Line added');
      setModalOpen(false);
      await fetchRows();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save line.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: Line) {
    if (!window.confirm('Remove this line?')) return;
    try {
      await api.delete(`${base}/${r.lineId}`);
      toast.success('Line removed');
      await fetchRows();
      onRefresh();
    } catch (err) { toast.error(extractMessage(err, 'Failed to remove line.')); }
  }

  const totalDebit = rows.reduce((s, r) => s + num(r.debit), 0);
  const totalCredit = rows.reduce((s, r) => s + num(r.credit), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  const columns: TableColumn<Line>[] = [
    { key: 'accountId', header: 'Account', render: (r) => <code className="text-xs text-text-primary">{r.accountId}</code> },
    { key: 'memo', header: 'Memo', render: (r) => <span className="text-text-secondary">{r.memo || '—'}</span> },
    { key: 'debit', header: 'Debit', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{fmt(r.debit)}</span> },
    { key: 'credit', header: 'Credit', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{fmt(r.credit)}</span> },
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
          getRowKey={(r) => r.lineId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No lines yet. Add debit/credit lines to build this entry."
          headerRight={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} /> Add Line
            </Button>
          }
        />
        <div className="flex items-center justify-end gap-6 px-2 text-sm">
          <span className="text-text-secondary">Total Debit: <span className="tabular-nums font-medium text-text-primary">{fmt(totalDebit)}</span></span>
          <span className="text-text-secondary">Total Credit: <span className="tabular-nums font-medium text-text-primary">{fmt(totalCredit)}</span></span>
          <span className={balanced ? 'text-success font-medium' : 'text-error font-medium'}>{balanced ? 'Balanced' : 'Not balanced'}</span>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Line' : 'Add Line'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Add'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="line-account" label="Account ID" required value={form.accountId}
            onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} />
          <Input id="line-memo" label="Memo" value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input id="line-debit" label="Debit" type="number" value={form.debit}
                onChange={(e) => setForm((f) => ({ ...f, debit: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="line-credit" label="Credit" type="number" value={form.credit}
                onChange={(e) => setForm((f) => ({ ...f, credit: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
