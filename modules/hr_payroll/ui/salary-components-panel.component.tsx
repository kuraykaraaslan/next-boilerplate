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

type Component = {
  componentId: string;
  name: string;
  type: string;
  amount?: string | null;
  employeeId: string;
  createdAt: string;
};
type ComponentForm = { name: string; type: string; amount: string; employeeId: string };
const EMPTY_FORM: ComponentForm = { name: '', type: 'EARNING', amount: '', employeeId: '' };
const TYPE_OPTIONS = [
  { value: 'EARNING', label: 'EARNING' },
  { value: 'DEDUCTION', label: 'DEDUCTION' },
];

const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export function SalaryComponentsPanel({ tenantId }: { tenantId: string }) {
  const [rows, setRows]         = useState<Component[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<ComponentForm>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number, q: string) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/payroll/components`, {
        params: { page: p - 1, pageSize: PAGE_SIZE, search: q || undefined },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load salary components.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page, search); }, [page, search, fetchRows]);

  function openCreate() {
    setEditId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true);
  }
  function openEdit(r: Component) {
    setEditId(r.componentId);
    setForm({ name: r.name, type: r.type, amount: r.amount ?? '', employeeId: r.employeeId });
    setFormError(''); setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false); setForm(EMPTY_FORM); setEditId(null); setFormError('');
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      name: form.name,
      type: form.type,
      amount: form.amount !== '' ? Number(form.amount) : undefined,
      employeeId: form.employeeId,
    };
    try {
      if (editId) {
        await api.patch(`/tenant/${tenantId}/api/payroll/components/${editId}`, payload);
        toast.success('Salary component updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/payroll/components`, payload);
        toast.success('Salary component created');
      }
      closeModal();
      fetchRows(page, search);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save salary component.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: Component) {
    if (!confirm(`Delete component "${r.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/payroll/components/${r.componentId}`);
      toast.success('Salary component deleted');
      fetchRows(page, search);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete salary component.'));
    }
  }

  const columns: TableColumn<Component>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    {
      key: 'type', header: 'Type',
      render: (r) => <Badge size="sm" variant={r.type === 'DEDUCTION' ? 'error' : 'success'}>{r.type}</Badge>,
    },
    { key: 'amount', header: 'Amount', render: (r) => <span className="tabular-nums text-text-secondary">{r.amount ?? '—'}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            { label: 'Edit', onClick: () => openEdit(r) },
            { label: 'Delete', variant: 'danger', onClick: () => handleDelete(r) },
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
        getRowKey={(r) => r.componentId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No salary components yet. Create one to get started."
        headerRight={
          <Button variant="primary" size="sm" onClick={openCreate}>New Component</Button>
        }
        toolbar={
          <div className="pb-4">
            <Input id="comp-search" label="Search" placeholder="Filter by name…"
              value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editId ? 'Edit Salary Component' : 'New Salary Component'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="comp-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Select id="comp-type" label="Type" options={TYPE_OPTIONS}
            value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
          <Input id="comp-amount" label="Amount" type="number" value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input id="comp-emp" label="Employee ID" required value={form.employeeId}
            onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
