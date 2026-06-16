'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@nb/setting/ui/SettingsPanelHost';
import { PlatformSmsTab } from '@nb/setting/ui/PlatformSettingsTabs';

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
