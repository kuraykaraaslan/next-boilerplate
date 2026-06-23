'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'payrollRunNumberPrefix',
    label: 'Run Number Prefix',
    group: 'Numbering',
    type: 'text',
    defaultValue: 'PR-',
  },
  {
    key: 'payrollAutoGeneratePayslips',
    label: 'Auto-generate Payslips on Process',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'payrollRunDefaultStatus',
    label: 'Default Status',
    group: 'Defaults',
    type: 'select',
    options: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PROCESSED', label: 'Processed' },
    ],
    defaultValue: 'DRAFT',
  },
];

export default function PayrollRunsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Payroll Runs"
      subtitle="Numbering and run policy"
      parentCrumb={{ label: 'Payroll Runs', href: `/tenant/${tenantId}/admin/payroll/runs` }}
      fields={FIELDS}
    />
  );
}
