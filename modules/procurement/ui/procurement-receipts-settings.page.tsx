'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'receiptNumberPrefix',
    label: 'Receipt Number Prefix',
    group: 'Numbering',
    type: 'text',
    defaultValue: 'GR-',
  },
  {
    key: 'receiptAutoCompleteOnFull',
    label: 'Auto-complete when fully received',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'true',
  },
];

export default function ProcurementReceiptsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Goods Receipts"
      subtitle="Numbering and receiving policy"
      parentCrumb={{ label: 'Goods Receipts', href: `/tenant/${tenantId}/admin/procurement/receipts` }}
      fields={FIELDS}
    />
  );
}
