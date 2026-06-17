'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@kuraykaraaslan/setting/ui/settings-panel-host.component';
import { PlatformNotificationsTab } from '@kuraykaraaslan/setting/ui/platform-settings-tabs.component';

export default function NotificationsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="Notifications"
      subtitle="Web push, email alerts, and Slack notifications"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <PlatformNotificationsTab {...p} />}
    </SettingsPanelHost>
  );
}
