'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@nb/setting/ui/settings-panel-host.component';
import { PlatformSecurityTab } from '@nb/setting/ui/platform-settings-tabs.component';

export default function SecuritySettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="Security"
      subtitle="Rate limiting, CORS, IP blocking, reCAPTCHA, cron secret"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <PlatformSecurityTab {...p} />}
    </SettingsPanelHost>
  );
}
