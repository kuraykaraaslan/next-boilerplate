'use client';
import { SettingsPanelHost } from '@nb/setting/ui/SettingsPanelHost';
import { PlatformAiTab } from '@nb/setting/ui/PlatformSettingsTabs';

/**
 * AI settings page. Served by the catch-all dynamic admin route via the ai
 * module's manifest `routes` entry (component id `ai/ui/AiSettingsPage`).
 */
export function AiSettingsPage({ tenantId }: { tenantId: string }) {
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
