'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'movementNumberPrefix',
    label: 'Movement Number Prefix',
    group: 'Numbering',
    type: 'text',
    defaultValue: 'MV-',
  },
  {
    key: 'movementRequireReason',
    label: 'Require Reason',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'movementAutoApplyOnCreate',
    label: 'Auto-apply on Create',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'true',
  },
];

export default function MovementsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Movements"
      subtitle="Movement numbering and policy"
      parentCrumb={{ label: 'Movements', href: `/tenant/${tenantId}/admin/inventory/movements` }}
      fields={FIELDS}
    />
  );
}
