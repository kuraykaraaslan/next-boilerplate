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
import { LeaveStatusBadge } from './hr_leave-status-badge.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

type LeaveRow = {
  leaveId: string;
  employeeId: string;
  leaveTypeId?: string | null;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
};
type LeaveTypeOption = { leaveTypeId: string; name: string; code: string };

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

type Props = { tenantId: string; employeeId: string };

export function EmployeeLeavePanel({ tenantId, employeeId }: Props) {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [leaveRes, typesRes] = await Promise.all([
        api.get(`/tenant/${tenantId}/api/hr/leave`, { params: { employeeId, pageSize: 100 } }),
        api.get(`/tenant/${tenantId}/api/hr/leave-types`, { params: { pageSize: 100 } }),
      ]);
      setRows(leaveRes.data.data ?? []);
      setLeaveTypes(typesRes.data.data ?? []);
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load leave.'));
    } finally { setLoading(false); }
  }, [tenantId, employeeId]);

  useEffect(() => { load(); }, [load]);

  const typeName = (id?: string | null) => leaveTypes.find((t) => t.leaveTypeId === id)?.name;

  async function handleAdd() {
    if (!form.startDate || !form.endDate) { setFormError('Start and end dates are required.'); return; }
    setSaving(true); setFormError('');
    try {
      await api.post(`/tenant/${tenantId}/api/hr/leave`, {
        employeeId,
        leaveTypeId: form.leaveTypeId || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      });
      toast.success('Leave request added');
      setShowAdd(false); setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      load();
    } catch (err) { setFormError(extractMessage(err, 'Failed to add leave.')); }
    finally { setSaving(false); }
  }

  async function handleWorkflow(row: LeaveRow, action: 'approve' | 'reject') {
    try {
      await api.post(`/tenant/${tenantId}/api/hr/leave/${row.leaveId}/${action}`);
      toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'}`);
      load();
    } catch (err) { toast.error(extractMessage(err, `Failed to ${action}.`)); }
  }

  async function handleDelete(row: LeaveRow) {
    if (!confirm('Delete this leave request?')) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/hr/leave/${row.leaveId}`);
      toast.success('Leave request deleted');
      load();
    } catch (err) { toast.error(extractMessage(err, 'Failed to delete.')); }
  }

  const columns: TableColumn<LeaveRow>[] = [
    {
      key: 'leaveTypeId', header: 'Leave Type',
      render: (r) => <span className="text-text-primary">{typeName(r.leaveTypeId) ?? r.type}</span>,
    },
    { key: 'startDate', header: 'Start', render: (r) => <span className="text-text-secondary">{r.startDate ? new Date(r.startDate).toLocaleDateString() : ''}</span> },
    { key: 'endDate', header: 'End', render: (r) => <span className="text-text-secondary">{r.endDate ? new Date(r.endDate).toLocaleDateString() : ''}</span> },
    { key: 'status', header: 'Status', render: (r) => <LeaveStatusBadge status={r.status} size="sm" /> },
    {
      key: '_actions', header: '', align: 'right',
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={[
            ...(r.status === 'PENDING' ? [
              { label: 'Approve', icon: <FontAwesomeIcon icon={faCheck} />, onClick: () => handleWorkflow(r, 'approve') },
              { label: 'Reject', icon: <FontAwesomeIcon icon={faXmark} />, onClick: () => handleWorkflow(r, 'reject') },
            ] : []),
            { label: 'Delete', icon: <FontAwesomeIcon icon={faTrash} />, variant: 'danger' as const, onClick: () => handleDelete(r) },
          ]} />
        </div>
      ),
    },
  ];

  const typeOptions = [
    { value: '', label: '— Select leave type —' },
    ...leaveTypes.map((t) => ({ value: t.leaveTypeId, label: `${t.name} (${t.code})` })),
  ];

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">Leave requests for this employee.</p>
        <ServerDataTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.leaveId}
          page={1}
          totalPages={1}
          total={rows.length}
          onPageChange={() => {}}
          hidePagination
          loading={loading}
          emptyMessage="No leave requests for this employee yet."
          headerRight={
            <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
              <FontAwesomeIcon icon={faPlus} /> Add Leave
            </Button>
          }
        />
        {loadError && <AlertBanner variant="error" message={loadError} />}
      </div>

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setFormError(''); }}
        title="Add Leave Request"
        footer={<>
          <Button variant="ghost" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleAdd} loading={saving}>Add</Button>
        </>}
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Select id="emp-leave-type" label="Leave Type" options={typeOptions}
            value={form.leaveTypeId} onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value }))} />
          <Input id="emp-leave-start" type="date" label="Start Date" value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          <Input id="emp-leave-end" type="date" label="End Date" value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          <Input id="emp-leave-reason" label="Reason" value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </div>
      </Modal>
    </>
  );
}
