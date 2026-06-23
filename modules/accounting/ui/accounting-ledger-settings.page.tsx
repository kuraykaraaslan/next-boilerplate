'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  { key: 'ledgerShowZeroBalances', label: 'Show Zero-balance Accounts', group: 'Display', type: 'boolean', defaultValue: 'false' },
  { key: 'ledgerDefaultPeriodDays', label: 'Default Period (days)', group: 'Display', type: 'number', defaultValue: '30' },
];

export default function AccountingLedgerSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Ledger"
      subtitle="Ledger view defaults"
      parentCrumb={{ label: 'Ledger', href: `/tenant/${tenantId}/admin/accounting/ledger` }}
      fields={FIELDS}
    />
  );
}
