'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@/modules_next/setting/ui/SettingsPanelHost';
import { PlatformEmailTab } from '@/modules_next/setting/ui/PlatformSettingsTabs';

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
