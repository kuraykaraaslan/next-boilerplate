'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import { ORDER_SETTINGS_FIELDS } from '@kuraykaraaslan/order/server/order.settings.fields';

export default function OrderSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Order Settings"
      subtitle="Defaults, numbering and policy for sales orders"
      parentCrumb={{ label: 'Orders', href: `/tenant/${tenantId}/admin/orders` }}
      fields={ORDER_SETTINGS_FIELDS}
    />
  );
}
