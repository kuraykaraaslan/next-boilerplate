'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@/modules_next/setting/ui/SettingsPanelHost';
import { PlatformNotificationsTab } from '@/modules_next/setting/ui/PlatformSettingsTabs';

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
