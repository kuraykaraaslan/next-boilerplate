'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@/modules_next/setting/ui/SettingsPanelHost';
import { PlatformSmsTab } from '@/modules_next/setting/ui/PlatformSettingsTabs';

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
