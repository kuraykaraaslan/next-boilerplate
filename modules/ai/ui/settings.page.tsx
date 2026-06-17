'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@kuraykaraaslan/setting/ui/settings-panel-host.component';
import { PlatformAiTab } from '@kuraykaraaslan/setting/ui/platform-settings-tabs.component';

/**
 * AI settings page. Served by the catch-all dynamic admin route via the ai
 * module's manifest `routes` entry (component id `ai/ui/settings.page`).
 */
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
