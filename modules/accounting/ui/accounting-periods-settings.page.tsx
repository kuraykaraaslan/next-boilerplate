'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  { key: 'fiscalYearStartMonth', label: 'Fiscal Year Start Month (1-12)', group: 'Calendar', type: 'number', defaultValue: '1' },
  { key: 'periodAutoCloseOnEnd', label: 'Auto-close on End Date', group: 'Policy', type: 'boolean', defaultValue: 'false' },
];

export default function AccountingPeriodsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Periods"
      subtitle="Fiscal period policy"
      parentCrumb={{ label: 'Periods', href: `/tenant/${tenantId}/admin/accounting/periods` }}
      fields={FIELDS}
    />
  );
}
