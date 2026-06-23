'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  { key: 'journalEntryPrefix', label: 'Entry Number Prefix', group: 'Numbering', type: 'text', defaultValue: 'JE-' },
  { key: 'journalRequireBalanced', label: 'Require Balanced to Post', group: 'Policy', type: 'boolean', defaultValue: 'true' },
  { key: 'journalAutoPostOnCreate', label: 'Auto-post on Create', group: 'Policy', type: 'boolean', defaultValue: 'false' },
];

export default function AccountingJournalSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Journal"
      subtitle="Journal entry numbering and posting"
      parentCrumb={{ label: 'Journal', href: `/tenant/${tenantId}/admin/accounting/journal` }}
      fields={FIELDS}
    />
  );
}
