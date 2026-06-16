'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@nb/setting/ui/settings-panel-host.component';
import { PlatformAuthTab } from '@nb/setting/ui/platform-settings-tabs.component';

export default function AuthSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="Authentication & SSO"
      subtitle="Registration, sessions, and OAuth/SSO providers"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <PlatformAuthTab {...p} />}
    </SettingsPanelHost>
  );
}
