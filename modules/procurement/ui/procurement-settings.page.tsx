'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import { PROCUREMENT_SETTINGS_FIELDS } from '@kuraykaraaslan/procurement/server/procurement.settings.fields';

export default function ProcurementSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Procurement Settings"
      subtitle="Defaults, numbering and approval policy for purchasing"
      parentCrumb={{ label: 'Purchase Orders', href: `/tenant/${tenantId}/admin/procurement/purchase-orders` }}
      fields={PROCUREMENT_SETTINGS_FIELDS}
    />
  );
}
