'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { ServerDataTable, type TableColumn } from '@kuraykaraaslan/common/ui/server-data-table.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Badge } from '@kuraykaraaslan/common/ui/badge.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { RowActionsMenu } from '@kuraykaraaslan/common/ui/row-actions-menu.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';

type LeaveType = {
  leaveTypeId: string;
  name: string;
  code: string;
  paid: boolean;
  maxDaysPerYear: number;
  color?: string | null;
  createdAt: string;
};

type Form = { name: string; code: string; paid: boolean; maxDaysPerYear: string };
const EMPTY_FORM: Form = { name: '', code: '', paid: false, maxDaysPerYear: '0' };

const PAGE_SIZE = 50;

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function HrLeaveTypesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [rows, setRows] = useState<LeaveType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/hr/leave-types`, {
        params: { page: p - 1, pageSize: PAGE_SIZE },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load leave types.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  const displayed = search
    ? rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : rows;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(r: LeaveType) {
    setEditing(r);
    setForm({ name: r.name, code: r.code, paid: r.paid, maxDaysPerYear: String(r.maxDaysPerYear ?? 0) });
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    setSaving(true); setFormError('');
    const payload = {
      name: form.name,
      code: form.code,
      paid: form.paid,
      maxDaysPerYear: form.maxDaysPerYear !== '' ? Number(form.maxDaysPerYear) : 0,
    };
    try {
      if (editing) {
        await api.patch(`/tenant/${tenantId}/api/hr/leave-types/${editing.leaveTypeId}`, payload);
        toast.success('Leave type updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/hr/leave-types`, payload);
        toast.success('Leave type created');
      }
      closeModal();
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save leave type.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: LeaveType) {
    if (!window.confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/hr/leave-types/${r.leaveTypeId}`);
      toast.success('Leave type deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete leave type.'));
    }
  }

  const columns: TableColumn<LeaveType>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
    { key: 'code', header: 'Code', render: (r) => <code className="text-xs text-text-secondary">{r.code}</code> },
    { key: 'paid', header: 'Paid', render: (r) => r.paid ? <Badge variant="success" size="sm">Paid</Badge> : <Badge variant="neutral" size="sm">Unpaid</Badge> },
    { key: 'maxDaysPerYear', header: 'Max Days/Year', render: (r) => <span className="text-text-secondary tabular-nums">{r.maxDaysPerYear}</span> },
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
      <PageHeader
        title="Leave Types"
        subtitle={loading ? '…' : `${total} leave type${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Leave Type</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={displayed}
        getRowKey={(r) => r.leaveTypeId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No leave types yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="leave-type-search"
              label="Search"
              placeholder="Filter by name…"
              prefixIcon={<FontAwesomeIcon icon={faSearch} className="w-3.5 h-3.5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Leave Type' : 'New Leave Type'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="leave-type-name" label="Name" required value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input id="leave-type-code" label="Code" required value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Input id="leave-type-maxDays" type="number" label="Max Days Per Year" value={form.maxDaysPerYear}
            onChange={(e) => setForm((f) => ({ ...f, maxDaysPerYear: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.paid} onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))} />
            Paid leave
          </label>
        </div>
      </Modal>
    </div>
  );
}
