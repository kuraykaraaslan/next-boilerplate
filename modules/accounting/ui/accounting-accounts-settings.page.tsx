'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  { key: 'accountCodeLength', label: 'Account Code Length', group: 'Numbering', type: 'number', defaultValue: '4' },
  { key: 'accountAllowPostingToParent', label: 'Allow Posting to Parent Accounts', group: 'Policy', type: 'boolean', defaultValue: 'false' },
];

export default function AccountingAccountsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Chart of Accounts"
      subtitle="Account code and posting policy"
      parentCrumb={{ label: 'Chart of Accounts', href: `/tenant/${tenantId}/admin/accounting/accounts` }}
      fields={FIELDS}
    />
  );
}
