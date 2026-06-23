'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import type { SettingFieldDef } from '@kuraykaraaslan/setting/server/setting-fields.types';

const FIELDS: SettingFieldDef[] = [
  {
    key: 'inventoryAllowNegativeStock',
    label: 'Allow Negative Stock',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    key: 'inventoryLowStockThreshold',
    label: 'Low-stock Threshold',
    group: 'Alerts',
    type: 'number',
    defaultValue: '0',
  },
  {
    key: 'inventoryTrackReserved',
    label: 'Track Reserved Quantity',
    group: 'Policy',
    type: 'boolean',
    defaultValue: 'true',
  },
];

export default function StockSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Stock"
      subtitle="Stock policy and thresholds"
      parentCrumb={{ label: 'Stock', href: `/tenant/${tenantId}/admin/inventory/stock` }}
      fields={FIELDS}
    />
  );
}
