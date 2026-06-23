'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'payslipNumberPrefix',
    label: 'Payslip Number Prefix',
    group: 'Numbering',
    type: 'text',
    defaultValue: 'PS-',
  },
  {
    key: 'payslipNetRoundingDecimals',
    label: 'Net Rounding Decimals',
    group: 'Calculation',
    type: 'number',
    defaultValue: '2',
  },
  {
    key: 'payslipShowEmployerCost',
    label: 'Show Employer Cost',
    group: 'Presentation',
    type: 'boolean',
    defaultValue: 'false',
  },
];

export default function PayrollPayslipsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Payslips"
      subtitle="Numbering and presentation of payslips"
      parentCrumb={{ label: 'Payslips', href: `/tenant/${tenantId}/admin/payroll/payslips` }}
      fields={FIELDS}
    />
  );
}
