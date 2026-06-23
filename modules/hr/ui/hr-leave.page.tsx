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
import { faPlus, faSearch, faPenToSquare, faTrash, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { LeaveStatusBadge } from './hr-status-badge.component';

type LeaveRequest = {
  leaveId: string;
  employeeId: string;
  type: string;
  leaveTypeId?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  reason?: string | null;
  createdAt: string;
};

type LeaveTypeOption = { leaveTypeId: string; name: string; code: string };

type Form = {
  employeeId: string; leaveTypeId: string; startDate: string;
  endDate: string; status: string; reason: string;
};
const EMPTY_FORM: Form = { employeeId: '', leaveTypeId: '', startDate: '', endDate: '', status: 'PENDING', reason: '' };

const PAGE_SIZE = 50;
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'PENDING' },
  { value: 'APPROVED', label: 'APPROVED' },
  { value: 'REJECTED', label: 'REJECTED' },
];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function HrLeavePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/hr/leave`, {
        params: { page: p - 1, pageSize: PAGE_SIZE },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load leave requests.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  useEffect(() => {
    api.get(`/tenant/${tenantId}/api/hr/leave-types`, { params: { pageSize: 100 } })
      .then((res) => setLeaveTypes(res.data.data ?? []))
      .catch(() => setLeaveTypes([]));
  }, [tenantId]);

  const typeName = (id?: string | null) => leaveTypes.find((t) => t.leaveTypeId === id)?.name;

  const displayed = search
    ? rows.filter((r) => r.employeeId.toLowerCase().includes(search.toLowerCase()))
    : rows;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(r: LeaveRequest) {
    setEditing(r);
    setForm({
      employeeId: r.employeeId,
      leaveTypeId: r.leaveTypeId ?? '',
      startDate: r.startDate ? r.startDate.slice(0, 10) : '',
      endDate: r.endDate ? r.endDate.slice(0, 10) : '',
      status: r.status,
      reason: r.reason ?? '',
    });
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
      employeeId: form.employeeId,
      leaveTypeId: form.leaveTypeId || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      status: form.status,
      reason: form.reason || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/tenant/${tenantId}/api/hr/leave/${editing.leaveId}`, payload);
        toast.success('Leave request updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/hr/leave`, payload);
        toast.success('Leave request created');
      }
      closeModal();
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save leave request.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: LeaveRequest) {
    if (!window.confirm(`Delete this leave request? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/hr/leave/${r.leaveId}`);
      toast.success('Leave request deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete leave request.'));
    }
  }

  async function handleWorkflow(r: LeaveRequest, action: 'approve' | 'reject') {
    try {
      await api.post(`/tenant/${tenantId}/api/hr/leave/${r.leaveId}/${action}`);
      toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'}`);
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, `Failed to ${action} leave request.`));
    }
  }

  const columns: TableColumn<LeaveRequest>[] = [
    { key: 'employeeId', header: 'Employee', render: (r) => <span className="font-medium text-text-primary">{r.employeeId}</span> },
    { key: 'type', header: 'Type', render: (r) => <span className="text-text-secondary">{typeName(r.leaveTypeId) ?? r.type}</span> },
    { key: 'status', header: 'Status', render: (r) => <LeaveStatusBadge status={r.status} size="sm" /> },
    { key: 'startDate', header: 'Start Date', render: (r) => <span className="text-text-secondary">{r.startDate ? new Date(r.startDate).toLocaleDateString() : ''}</span> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            ...(r.status === 'PENDING' ? [
              { label: 'Approve', icon: <FontAwesomeIcon icon={faCheck} />, onClick: () => handleWorkflow(r, 'approve') },
              { label: 'Reject', icon: <FontAwesomeIcon icon={faXmark} />, onClick: () => handleWorkflow(r, 'reject') },
            ] : []),
            { label: 'Edit', icon: <FontAwesomeIcon icon={faPenToSquare} />, onClick: () => openEdit(r) },
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger' as const, onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests"
        subtitle={loading ? '…' : `${total} leave request${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Leave Requests</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={displayed}
        getRowKey={(r) => r.leaveId}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No leave requests yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="leave-search"
              label="Search"
              placeholder="Filter by employee…"
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
        title={editing ? 'Edit Leave Request' : 'New Leave Request'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="leave-employeeId" label="Employee Id" required value={form.employeeId}
            onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} />
          <Select id="leave-type" label="Leave Type"
            options={[{ value: '', label: '— Select leave type —' }, ...leaveTypes.map((t) => ({ value: t.leaveTypeId, label: `${t.name} (${t.code})` }))]}
            value={form.leaveTypeId} onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value }))} />
          <Input id="leave-startDate" type="date" label="Start Date" value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          <Input id="leave-endDate" type="date" label="End Date" value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          <Select id="leave-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          <Input id="leave-reason" label="Reason" value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
