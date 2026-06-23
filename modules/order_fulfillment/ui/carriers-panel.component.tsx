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

type Carrier = {
  carrierId: string;
  name: string;
  code: string;
  trackingUrlPattern?: string | null;
  isActive: boolean;
};

const PAGE_SIZE = 50;

type Form = { name: string; code: string; trackingUrlPattern: string; isActive: string };
const EMPTY_FORM: Form = { name: '', code: '', trackingUrlPattern: '', isActive: 'true' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function CarriersPanel({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<Carrier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/tenant/${tenantId}/api/fulfillment/carriers`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE, search: search || undefined } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load carriers.'));
    } finally { setLoading(false); }
  }, [base, search]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }
  function openEdit(r: Carrier) {
    setEditId(r.carrierId);
    setForm({
      name: r.name ?? '', code: r.code ?? '',
      trackingUrlPattern: r.trackingUrlPattern ?? '',
      isActive: r.isActive ? 'true' : 'false',
    });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      name: form.name,
      code: form.code,
      trackingUrlPattern: form.trackingUrlPattern || undefined,
      isActive: form.isActive === 'true',
    };
    try {
      if (editId) await api.patch(`${base}/${editId}`, payload);
      else await api.post(base, payload);
      toast.success(editId ? 'Carrier updated' : 'Carrier created');
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save carrier.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: Carrier) {
    if (!window.confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`${base}/${r.carrierId}`);
      toast.success('Carrier deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete carrier.'));
    }
  }

  const columns: TableColumn<Carrier>[] = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-medium text-text-primary">{r.code}</span> },
    { key: 'name', header: 'Name', render: (r) => <span className="text-text-primary">{r.name}</span> },
    { key: 'trackingUrlPattern', header: 'Tracking URL', render: (r) => <span className="text-text-secondary truncate">{r.trackingUrlPattern ?? '—'}</span> },
    { key: 'isActive', header: 'Active', render: (r) => <span className="text-text-secondary">{r.isActive ? 'Yes' : 'No'}</span> },
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
        getRowKey={(r) => r.carrierId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No carriers yet. Create one to get started."
        headerRight={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} /> New Carrier
          </Button>
        }
        toolbar={
          <div className="pb-4">
            <Input
              id="carrier-search"
              label="Search"
              placeholder="Filter by name…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Carrier' : 'New Carrier'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="carrier-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="carrier-code" label="Code" required value={form.code} disabled={!!editId}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Input id="carrier-tracking" label="Tracking URL Pattern" placeholder="https://track.example.com/{tracking}"
            value={form.trackingUrlPattern}
            onChange={(e) => setForm((f) => ({ ...f, trackingUrlPattern: e.target.value }))} />
          <Select id="carrier-active" label="Active"
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            value={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
