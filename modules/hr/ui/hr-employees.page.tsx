'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { EmployeeStatusBadge } from './hr-status-badge.component';

type Employee = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string | null;
  title?: string | null;
  status: string;
  hiredAt?: string | null;
  createdAt: string;
};

type Form = {
  firstName: string; lastName: string; email: string;
  departmentId: string; title: string; status: string; hiredAt: string;
};
const EMPTY_FORM: Form = { firstName: '', lastName: '', email: '', departmentId: '', title: '', status: 'ACTIVE', hiredAt: '' };

const PAGE_SIZE = 50;
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'ONLEAVE', label: 'ONLEAVE' },
  { value: 'TERMINATED', label: 'TERMINATED' },
];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function HrEmployeesPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const router = useRouter();
  const [rows, setRows] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/hr/employees`, {
        params: { page: p - 1, pageSize: PAGE_SIZE },
      });
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setFetchError(extractMessage(err, 'Failed to load employees.'));
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchRows(page); }, [page, fetchRows]);

  const displayed = search
    ? rows.filter((r) => r.email.toLowerCase().includes(search.toLowerCase())
        || `${r.firstName} ${r.lastName}`.toLowerCase().includes(search.toLowerCase()))
    : rows;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(r: Employee) {
    setEditing(r);
    setForm({
      firstName: r.firstName, lastName: r.lastName, email: r.email,
      departmentId: r.departmentId ?? '', title: r.title ?? '',
      status: r.status, hiredAt: r.hiredAt ? r.hiredAt.slice(0, 10) : '',
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
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      departmentId: form.departmentId || undefined,
      title: form.title || undefined,
      status: form.status,
      hiredAt: form.hiredAt || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/tenant/${tenantId}/api/hr/employees/${editing.employeeId}`, payload);
        toast.success('Employee updated');
      } else {
        await api.post(`/tenant/${tenantId}/api/hr/employees`, payload);
        toast.success('Employee created');
      }
      closeModal();
      fetchRows(page);
    } catch (err) {
      setFormError(extractMessage(err, 'Failed to save employee.'));
    } finally { setSaving(false); }
  }

  async function handleDelete(r: Employee) {
    if (!window.confirm(`Delete "${r.firstName} ${r.lastName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenant/${tenantId}/api/hr/employees/${r.employeeId}`);
      toast.success('Employee deleted');
      fetchRows(page);
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to delete employee.'));
    }
  }

  const columns: TableColumn<Employee>[] = [
    { key: 'firstName', header: 'First Name', render: (r) => <span className="font-medium text-text-primary">{r.firstName}</span> },
    { key: 'lastName', header: 'Last Name', render: (r) => <span className="text-text-secondary">{r.lastName}</span> },
    { key: 'email', header: 'Email', render: (r) => <span className="text-text-secondary">{r.email}</span> },
    { key: 'status', header: 'Status', render: (r) => <EmployeeStatusBadge status={r.status} size="sm" /> },
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
        title="Employees"
        subtitle={loading ? '…' : `${total} employee${total !== 1 ? 's' : ''}`}
        actions={[{ label: <><FontAwesomeIcon icon={faPlus} /> New Employees</>, onClick: openCreate }]}
      />

      {fetchError && <AlertBanner variant="error" message={fetchError} />}

      <ServerDataTable
        columns={columns}
        rows={displayed}
        getRowKey={(r) => r.employeeId}
        onRowClick={(r) => router.push(`/tenant/${tenantId}/admin/hr/employees/${r.employeeId}`)}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No employees yet. Create one to get started."
        toolbar={
          <div className="pb-4">
            <Input
              id="employee-search"
              label="Search"
              placeholder="Filter by name or email…"
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
        title={editing ? 'Edit Employee' : 'New Employee'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <AlertBanner variant="error" message={formError} />}
          <Input id="employee-firstName" label="First Name" required value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          <Input id="employee-lastName" label="Last Name" required value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          <Input id="employee-email" label="Email" required value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input id="employee-departmentId" label="Department Id" value={form.departmentId}
            onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} />
          <Input id="employee-title" label="Title" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Select id="employee-status" label="Status" options={STATUS_OPTIONS}
            value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          <Input id="employee-hiredAt" type="date" label="Hired At" value={form.hiredAt}
            onChange={(e) => setForm((f) => ({ ...f, hiredAt: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
