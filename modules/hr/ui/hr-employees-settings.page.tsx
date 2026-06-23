'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'employeeNumberPrefix',
    label: 'Employee Number Prefix',
    group: 'Numbering',
    type: 'text',
    defaultValue: 'EMP-',
  },
  {
    key: 'employeeDefaultStatus',
    label: 'Default Status',
    group: 'Defaults',
    type: 'select',
    options: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'ONLEAVE', label: 'On Leave' },
      { value: 'TERMINATED', label: 'Terminated' },
    ],
    defaultValue: 'ACTIVE',
  },
  {
    key: 'employeeRequireEmail',
    label: 'Require Email',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'true',
  },
];

export default function HrEmployeesSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Employees"
      subtitle="Defaults and policy for employee records"
      parentCrumb={{ label: 'Employees', href: `/tenant/${tenantId}/admin/hr/employees` }}
      fields={FIELDS}
    />
  );
}
