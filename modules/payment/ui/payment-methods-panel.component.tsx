'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type PaymentMethodRow = {
  methodId: string;
  name: string;
  code: string;
  gateway?: string | null;
  isActive: boolean;
  createdAt: string;
};

const PAGE_SIZE = 50;
const GATEWAY_OPTIONS = ['', 'STRIPE', 'PAYPAL', 'IYZICO', 'MANUAL'].map((v) => ({ value: v, label: v || 'None' }));

type Form = { name: string; code: string; gateway: string; isActive: string };
const EMPTY_FORM: Form = { name: '', code: '', gateway: '', isActive: 'true' };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function PaymentMethodsPanel({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<PaymentMethodRow[]>([]);
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
  const base = `/tenant/${tenantId}/api/payments/methods`;

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(base, { params: { page: p - 1, pageSize: PAGE_SIZE, search: search || undefined } });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load payment methods.'));
    } finally { setLoading(false); }
  }, [base, search]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); }
  function openEdit(r: PaymentMethodRow) {
    setEditId(r.methodId);
    setForm({ name: r.name ?? '', code: r.code ?? '', gateway: r.gateway ?? '', isActive: r.isActive ? 'true' : 'false' });
    setFormError(''); setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = { name: form.name, code: form.code, gateway: form.gateway || undefined, isActive: form.isActive === 'true' };
    try {
      if (editId) await api.patch(`${base}/${editId}`, payload);
      else await api.post(base, payload);
      toast.success(editId ? 'Payment method updated' : 'Payment method created');
      setModalOpen(false);
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save payment method.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: PaymentMethodRow) {
    if (!window.confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`${base}/${r.methodId}`);
      toast.success('Payment method deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete payment method.'));
    }
  }

  const columns: TableColumn<PaymentMethodRow>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { key: 'code', header: 'Code', render: (r) => <span className="font-mono text-xs text-text-secondary">{r.code}</span> },
    { key: 'gateway', header: 'Gateway', render: (r) => <span className="text-text-secondary">{r.gateway || '—'}</span> },
    { key: 'isActive', header: 'Active', render: (r) => r.isActive
        ? <Badge variant="success" size="sm" dot>Active</Badge>
        : <Badge variant="neutral" size="sm" dot>Inactive</Badge> },
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
        getRowKey={(r) => r.methodId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No payment methods yet. Create one to get started."
        headerRight={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} /> New Method
          </Button>
        }
        toolbar={
          <div className="pb-4">
            <Input
              id="method-search"
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
        title={editId ? 'Edit Payment Method' : 'New Payment Method'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.name || !form.code}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="method-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="method-code" label="Code" required value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Select id="method-gateway" label="Gateway" options={GATEWAY_OPTIONS}
            value={form.gateway} onChange={(e) => setForm((f) => ({ ...f, gateway: e.target.value }))} />
          <Select id="method-active" label="Active"
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            value={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
