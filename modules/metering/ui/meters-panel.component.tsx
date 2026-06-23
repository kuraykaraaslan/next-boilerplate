'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Meter = {
  meterId: string;
  key: string;
  name: string;
  unit: string;
  aggregation: string;
  unitPriceMinor: string;
  includedQuantity: string;
  currency: string;
  active: boolean;
};

const PAGE_SIZE = 50;
const AGG_OPTIONS = ['SUM', 'MAX', 'LAST'].map((v) => ({ value: v, label: v }));

type Form = {
  key: string; name: string; unit: string; aggregation: string;
  unitPriceMinor: string; includedQuantity: string; active: string;
};
const EMPTY: Form = { key: '', name: '', unit: '', aggregation: 'SUM', unitPriceMinor: '0', includedQuantity: '0', active: 'true' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

/**
 * Configurable master-data panel for meter definitions (name, unit, rate,
 * active). Mirrors the accounting Journals panel — a tab on the Metering
 * settings page over the existing /api/metering/meters CRUD.
 */
export function MetersPanel({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<Meter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/tenant/${tenantId}/api/metering/meters`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE, q: search || undefined } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load meters.'));
    } finally { setLoading(false); }
  }, [base, search]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() { setEditId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(r: Meter) {
    setEditId(r.meterId);
    setForm({
      key: r.key, name: r.name, unit: r.unit, aggregation: r.aggregation,
      unitPriceMinor: String(r.unitPriceMinor ?? '0'), includedQuantity: String(r.includedQuantity ?? '0'),
      active: r.active ? 'true' : 'false',
    });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    try {
      if (editId) {
        await api.patch(`${base}/${editId}`, {
          name: form.name, unit: form.unit, aggregation: form.aggregation,
          unitPriceMinor: form.unitPriceMinor || '0', includedQuantity: form.includedQuantity || '0',
          active: form.active === 'true',
        });
        toast.success('Meter updated');
      } else {
        await api.post(base, {
          key: form.key, name: form.name, unit: form.unit, aggregation: form.aggregation,
          unitPriceMinor: form.unitPriceMinor || '0', includedQuantity: form.includedQuantity || '0',
          active: form.active === 'true',
        });
        toast.success('Meter created');
      }
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save meter.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: Meter) {
    if (!window.confirm(`Delete meter "${r.name}"? Historical events are retained.`)) return;
    try {
      await api.delete(`${base}/${r.meterId}`);
      toast.success('Meter deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete meter.'));
    }
  }

  const columns: TableColumn<Meter>[] = [
    { key: 'key', header: 'Key', render: (r) => <span className="font-mono text-text-primary">{r.key}</span> },
    { key: 'name', header: 'Name', render: (r) => <span className="text-text-primary">{r.name}</span> },
    { key: 'unit', header: 'Unit', render: (r) => <span className="text-text-secondary">{r.unit}</span> },
    { key: 'unitPriceMinor', header: 'Rate (minor)', align: 'right', render: (r) => <span className="tabular-nums text-text-secondary">{r.unitPriceMinor}</span> },
    { key: 'active', header: 'Active', render: (r) => <span className="text-text-secondary">{r.active ? 'Yes' : 'No'}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(r) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {fetchError && <AlertBanner variant="error" message={fetchError} />}
      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.meterId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No meters yet. Create one to get started."
        headerRight={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} /> New Meter
          </Button>
        }
        toolbar={
          <div className="pb-4">
            <Input id="meter-cfg-search" label="Search" placeholder="Filter by name…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Meter' : 'New Meter'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.name || !form.unit || (!editId && !form.key)}>
              {editId ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          {!editId && (
            <Input id="meter-cfg-key" label="Key" required value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="api_calls" />
          )}
          <Input id="meter-cfg-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="meter-cfg-unit" label="Unit" required value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="request" />
          <Select id="meter-cfg-agg" label="Aggregation" options={AGG_OPTIONS}
            value={form.aggregation} onChange={(e) => setForm((f) => ({ ...f, aggregation: e.target.value }))} />
          <Input id="meter-cfg-rate" label="Rate (minor units)" type="number" value={form.unitPriceMinor}
            onChange={(e) => setForm((f) => ({ ...f, unitPriceMinor: e.target.value }))} />
          <Input id="meter-cfg-included" label="Included quantity" type="number" value={form.includedQuantity}
            onChange={(e) => setForm((f) => ({ ...f, includedQuantity: e.target.value }))} />
          <Select id="meter-cfg-active" label="Active"
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            value={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
