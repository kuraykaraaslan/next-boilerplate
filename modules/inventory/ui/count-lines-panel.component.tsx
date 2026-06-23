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

type CountLine = {
  countLineId: string;
  stockItemId: string;
  systemQty: number;
  countedQty: number;
};

type LineForm = { stockItemId: string; systemQty: string; countedQty: string };
const EMPTY: LineForm = { stockItemId: '', systemQty: '0', countedQty: '0' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  countId: string;
  readOnly?: boolean;
  onRefresh: () => void;
};

export function CountLinesPanel({ tenantId, countId, readOnly, onRefresh }: Props) {
  const base = `/tenant/${tenantId}/api/inventory/counts/${countId}/lines`;
  const [rows, setRows] = useState<CountLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LineForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base);
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load lines.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function openCreate() { setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(l: CountLine) {
    setEditingId(l.countLineId);
    setForm({ stockItemId: l.stockItemId, systemQty: String(l.systemQty), countedQty: String(l.countedQty) });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      stockItemId: form.stockItemId,
      systemQty: Number(form.systemQty || 0),
      countedQty: Number(form.countedQty || 0),
    };
    try {
      if (editingId) await api.patch(`${base}/${editingId}`, payload);
      else await api.post(base, payload);
      toast.success(editingId ? 'Line updated' : 'Line added');
      setModalOpen(false);
      fetchRows();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save line.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(l: CountLine) {
    if (!window.confirm('Remove this count line?')) return;
    try {
      await api.delete(`${base}/${l.countLineId}`);
      toast.success('Line removed');
      fetchRows();
      onRefresh();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to remove line.'));
    }
  }

  const columns: TableColumn<CountLine>[] = [
    { key: 'stockItemId', header: 'Stock Item', render: (l) => <code className="text-xs text-text-secondary">{l.stockItemId}</code> },
    { key: 'systemQty', header: 'System Qty', render: (l) => <span className="tabular-nums text-text-primary">{l.systemQty}</span> },
    { key: 'countedQty', header: 'Counted Qty', render: (l) => <span className="tabular-nums text-text-primary">{l.countedQty}</span> },
    {
      key: 'amount', header: 'Diff',
      render: (l) => {
        const diff = Number(l.countedQty) - Number(l.systemQty);
        const cls = diff > 0 ? 'text-success' : diff < 0 ? 'text-error' : 'text-text-secondary';
        return <span className={`tabular-nums font-medium ${cls}`}>{diff > 0 ? `+${diff}` : diff}</span>;
      },
    },
    ...(readOnly ? [] : [{
      key: '_actions', header: '', align: 'right' as const,
      render: (l: CountLine) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(l) },
            { label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger' as const, onClick: () => handleDelete(l) },
          ]} />
        </div>
      ),
    }]),
  ];

  return (
    <>
      <div className="space-y-4">
        {fetchError && <AlertBanner variant="error" message={fetchError} />}
        <ServerDataTable
          columns={columns}
          rows={rows}
          getRowKey={(l) => l.countLineId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No count lines yet. Add a line for each stock item being counted."
          headerRight={readOnly ? undefined : (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} /> Add Line
            </Button>
          )}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Count Line' : 'Add Count Line'}
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.stockItemId}>{editingId ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="cl-stock" label="Stock Item ID" required value={form.stockItemId}
            onChange={(e) => setForm((f) => ({ ...f, stockItemId: e.target.value }))} />
          <Input id="cl-system" label="System Qty" type="number" value={form.systemQty}
            onChange={(e) => setForm((f) => ({ ...f, systemQty: e.target.value }))} />
          <Input id="cl-counted" label="Counted Qty" type="number" value={form.countedQty}
            onChange={(e) => setForm((f) => ({ ...f, countedQty: e.target.value }))} />
        </div>
      </Modal>
    </>
  );
}
