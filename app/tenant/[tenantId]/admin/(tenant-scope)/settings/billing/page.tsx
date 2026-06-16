'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@nb/setting/ui/SettingsPanelHost';
import { BillingTab } from '@nb/setting/ui/TenantSettingsPanels';

export default function BillingSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="Billing"
      subtitle="Billing identity shown on invoices and receipts"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <BillingTab {...p} />}
    </SettingsPanelHost>
  );
}
