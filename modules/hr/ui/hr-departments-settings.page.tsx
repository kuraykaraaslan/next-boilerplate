'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'departmentCodePrefix',
    label: 'Department Code Prefix',
    group: 'Numbering',
    type: 'text',
    defaultValue: 'DEP-',
  },
  {
    key: 'departmentDefaultActive',
    label: 'New Departments Active',
    group: 'Defaults',
    type: 'boolean',
    defaultValue: 'true',
  },
];

export default function HrDepartmentsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Departments"
      subtitle="Defaults for departments"
      parentCrumb={{ label: 'Departments', href: `/tenant/${tenantId}/admin/hr/departments` }}
      fields={FIELDS}
    />
  );
}
