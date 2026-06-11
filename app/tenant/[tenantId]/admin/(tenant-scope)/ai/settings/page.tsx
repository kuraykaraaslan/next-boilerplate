'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@/modules_next/setting/ui/SettingsPanelHost';
import { PlatformAiTab } from '@/modules_next/setting/ui/PlatformSettingsTabs';

export default function AiSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="AI"
      subtitle="AI providers and API credentials"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <PlatformAiTab {...p} />}
    </SettingsPanelHost>
  );
}
