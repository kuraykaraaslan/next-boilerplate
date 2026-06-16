'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@nb/setting/ui/settings-panel-host.component';
import { PlatformPaymentTab } from '@nb/setting/ui/platform-settings-tabs.component';

export default function PaymentsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="Payments"
      subtitle="Currency, tax, and payment provider credentials"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <PlatformPaymentTab {...p} />}
    </SettingsPanelHost>
  );
}
