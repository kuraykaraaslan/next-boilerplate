'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'warehouseCodePrefix',
    label: 'Warehouse Code Prefix',
    group: 'Numbering',
    type: 'text',
    defaultValue: 'WH-',
  },
  {
    key: 'warehouseDefaultActive',
    label: 'New Warehouses Active',
    group: 'Defaults',
    type: 'boolean',
    defaultValue: 'true',
  },
];

export default function WarehousesSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Warehouses"
      subtitle="Warehouse defaults"
      parentCrumb={{ label: 'Warehouses', href: `/tenant/${tenantId}/admin/inventory/warehouses` }}
      fields={FIELDS}
    />
  );
}
