'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@kuraykaraaslan/setting/ui/settings-panel-host.component';
import { PlatformSmsTab } from '@kuraykaraaslan/setting/ui/platform-settings-tabs.component';

export default function SmsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="SMS"
      subtitle="SMS provider configuration (Twilio, Netgsm)"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <PlatformSmsTab {...p} />}
    </SettingsPanelHost>
  );
}
