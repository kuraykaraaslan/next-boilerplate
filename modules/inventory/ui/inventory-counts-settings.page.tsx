'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'countAutoAdjustOnClose',
    label: 'Auto-adjust Stock on Close',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'countRequireRecount',
    label: 'Require Recount on Variance',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'false',
  },
];

export default function CountsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Counts"
      subtitle="Stock count policy"
      parentCrumb={{ label: 'Counts', href: `/tenant/${tenantId}/admin/inventory/counts` }}
      fields={FIELDS}
    />
  );
}
