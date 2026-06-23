'use client';
import { use, useCallback, useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { Input } from '@kuraykaraaslan/common/ui/input.component';
import { Select } from '@kuraykaraaslan/common/ui/select.component';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { toast } from '@kuraykaraaslan/common/ui/toast.store';
import { EmployeeStatusBadge } from './hr-status-badge.component';
import { EmployeeLeavePanel } from '@kuraykaraaslan/hr_leave/ui/employee-leave-panel.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';

type Employee = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string | null;
  title?: string | null;
  status: string;
  hiredAt?: string | null;
};

type Form = {
  firstName: string; lastName: string; email: string;
  departmentId: string; title: string; status: string; hiredAt: string;
};

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'ONLEAVE', label: 'ONLEAVE' },
  { value: 'TERMINATED', label: 'TERMINATED' },
];

function extractMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ tenantId: string; employeeId: string }> }) {
  const { tenantId, employeeId } = use(params);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState<Form>({
    firstName: '', lastName: '', email: '', departmentId: '', title: '', status: 'ACTIVE', hiredAt: '',
  });

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await api.get(`/tenant/${tenantId}/api/hr/employees/${employeeId}`);
      const e: Employee = res.data.item;
      setEmployee(e);
      setForm({
        firstName: e.firstName, lastName: e.lastName, email: e.email,
        departmentId: e.departmentId ?? '', title: e.title ?? '',
        status: e.status, hiredAt: e.hiredAt ? e.hiredAt.slice(0, 10) : '',
      });
    } catch (err) {
      setLoadError(extractMessage(err, 'Failed to load employee.'));
    } finally { setLoading(false); }
  }, [tenantId, employeeId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveError('');
    try {
      await api.patch(`/tenant/${tenantId}/api/hr/employees/${employeeId}`, {
        firstName: form.firstName, lastName: form.lastName, email: form.email,
        departmentId: form.departmentId || undefined, title: form.title || undefined,
        status: form.status, hiredAt: form.hiredAt || undefined,
      });
      toast.success('Employee saved');
      load();
    } catch (err) {
      setSaveError(extractMessage(err, 'Failed to save.'));
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <AlertBanner variant="error" message={loadError} />;
  if (!employee) return null;

  const generalContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Identity</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input id="e-firstName" label="First Name" required value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="flex-1">
                <Input id="e-lastName" label="Last Name" required value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <Input id="e-email" label="Email" required value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
        </Card>
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Job</h3>
            <Input id="e-departmentId" label="Department Id" value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} />
            <Input id="e-title" label="Title" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input id="e-hiredAt" type="date" label="Hired At" value={form.hiredAt}
              onChange={(e) => setForm((f) => ({ ...f, hiredAt: e.target.value }))} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Status</h3>
            <Select id="e-status" label="Status" options={STATUS_OPTIONS} value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          </div>
        </Card>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', content: generalContent },
    { id: 'leave', label: 'Leave', content: <EmployeeLeavePanel tenantId={tenantId} employeeId={employeeId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Employees', href: `/tenant/${tenantId}/admin/hr/employees` },
        { label: `${employee.firstName} ${employee.lastName}` },
      ]} />

      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        subtitle={employee.email}
        badge={<EmployeeStatusBadge status={form.status} />}
        actions={[
          { label: <><FontAwesomeIcon icon={faSave} /> {saving ? 'Saving…' : 'Save'}</>, onClick: handleSave, disabled: saving },
        ]}
      />

      {saveError && <AlertBanner variant="error" message={saveError} />}

      <TabGroup tabs={tabs} />
    </div>
  );
}
