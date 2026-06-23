'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

type FeatureRow = {
  featureId: string;
  key: string;
  label: string;
  type: string;
  value: string;
  sortOrder: number;
};

type FeatureForm = { key: string; label: string; type: string; value: string; sortOrder: string };
const EMPTY: FeatureForm = { key: '', label: '', type: 'BOOLEAN', value: 'true', sortOrder: '0' };
const TYPE_OPTIONS = [
  { value: 'BOOLEAN', label: 'Boolean (flag)' },
  { value: 'LIMIT', label: 'Limit (quota)' },
];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = {
  tenantId: string;
  subscriptionId: string;
  onRefresh: () => void;
};

export function SubscriptionLinesPanel({ tenantId, subscriptionId, onRefresh }: Props) {
  const [rows, setRows] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FeatureForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const base = `/tenant/${tenantId}/api/subscriptions/${subscriptionId}/lines`;

  const fetchLines = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base);
      setRows(res.data.data ?? []);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load plan features.'));
    } finally { setLoading(false); }
  }, [base]);

  useEffect(() => { fetchLines(); }, [fetchLines]);

  function openCreate() { setEditId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(r: FeatureRow) {
    setEditId(r.featureId);
    setForm({ key: r.key, label: r.label, type: r.type, value: r.value, sortOrder: String(r.sortOrder) });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      key: form.key,
      label: form.label,
      type: form.type,
      value: form.value,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editId) {
        await api.patch(`${base}/${editId}`, payload);
        toast.success('Feature updated');
      } else {
        await api.post(base, payload);
        toast.success('Feature added');
      }
      setModalOpen(false);
      await fetchLines();
      onRefresh();
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save feature.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: FeatureRow) {
    if (!confirm(`Remove feature "${r.label}"?`)) return;
    try {
      await api.delete(`${base}/${r.featureId}`);
      toast.success('Feature removed');
      await fetchLines();
      onRefresh();
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to remove feature.'));
    }
  }

  const columns: TableColumn<FeatureRow>[] = [
    { key: 'label', header: 'Feature', render: (r) => <span className="font-medium text-text-primary">{r.label}</span> },
    { key: 'key', header: 'Key', render: (r) => <span className="font-mono text-xs text-text-secondary">{r.key}</span> },
    { key: 'type', header: 'Type', render: (r) => <span className="text-text-secondary">{r.type}</span> },
    { key: 'value', header: 'Value', align: 'right', render: (r) => <span className="tabular-nums text-text-primary">{r.value}</span> },
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
          getRowKey={(r) => r.featureId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No plan features yet. Add one to describe this subscription's entitlements."
          headerRight={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} /> Add Feature
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Feature' : 'Add Feature'}
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.key || !form.label}>{editId ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="feat-key" label="Key" required value={form.key} disabled={!!editId}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          <Input id="feat-label" label="Label" required value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Select id="feat-type" label="Type" options={TYPE_OPTIONS}
                value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
            </div>
            <div className="flex-1">
              <Input id="feat-value" label="Value" required value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
            </div>
          </div>
          <Input id="feat-sort" label="Sort Order" type="number" value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
        </div>
      </Modal>
    </>
  );
}
