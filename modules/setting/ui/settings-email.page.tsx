'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@kuraykaraaslan/setting/ui/settings-panel-host.component';
import { PlatformEmailTab } from '@kuraykaraaslan/setting/ui/platform-settings-tabs.component';

export default function EmailSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="Email"
      subtitle="Outbound email / SMTP configuration for this organization"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <PlatformEmailTab {...p} />}
    </SettingsPanelHost>
  );
}
