'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
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
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type Uom = {
  uomId: string;
  name: string;
  code: string;
  ratio: number;
  isActive: boolean;
  createdAt: string;
};

type Form = { name: string; code: string; ratio: string; isActive: string };
const EMPTY: Form = { name: '', code: '', ratio: '1', isActive: 'true' };
const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function InventoryUomsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [rows, setRows] = useState<Uom[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/tenant/${tenantId}/api/inventory/uoms`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE, search: search || undefined } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load units of measure.'));
    } finally { setLoading(false); }
  }, [base, search]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() { setEditingId(null); setForm(EMPTY); setFormError(''); setModalOpen(true); }
  function openEdit(u: Uom) {
    setEditingId(u.uomId);
    setForm({ name: u.name ?? '', code: u.code ?? '', ratio: String(u.ratio ?? 1), isActive: String(!!u.isActive) });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      name: form.name,
      code: form.code,
      ratio: Number(form.ratio || 1),
      isActive: form.isActive === 'true',
    };
    try {
      if (editingId) await api.patch(`${base}/${editingId}`, payload);
      else await api.post(base, payload);
      toast.success(editingId ? 'Unit updated' : 'Unit created');
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save unit.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(u: Uom) {
    if (!window.confirm(`Delete "${u.name}"?`)) return;
    try {
      await api.delete(`${base}/${u.uomId}`);
      toast.success('Unit deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete unit.'));
    }
  }

  const columns: TableColumn<Uom>[] = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-medium text-text-primary">{u.name}</span> },
    { key: 'code', header: 'Code', render: (u) => <span className="text-text-secondary">{u.code}</span> },
    { key: 'ratio', header: 'Ratio', render: (u) => <span className="tabular-nums text-text-secondary">{u.ratio}</span> },
    { key: 'isActive', header: 'Active', render: (u) => <span className="text-text-secondary">{u.isActive ? 'Yes' : 'No'}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (u) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(u) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger', onClick: () => handleDelete(u) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Units of Measure"
        subtitle={loading ? '…' : `${total} unit${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Unit</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowKey={(u) => u.uomId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No units of measure yet."
        toolbar={
          <div className="pb-4">
            <Input id="uom-search" label="Search" placeholder="Filter by name…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Unit' : 'New Unit'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editingId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="uom-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="uom-code" label="Code" required value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Input id="uom-ratio" label="Ratio" type="number" value={form.ratio}
            onChange={(e) => setForm((f) => ({ ...f, ratio: e.target.value }))} />
          <Select id="uom-active" label="Active"
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            value={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
