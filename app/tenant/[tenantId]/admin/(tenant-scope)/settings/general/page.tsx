'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@nb/setting/ui/SettingsPanelHost';
import { GeneralTab } from '@nb/setting/ui/TenantSettingsPanels';

export default function GeneralSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="General"
      subtitle="Organization identity, contact details, and locale"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <GeneralTab {...p} />}
    </SettingsPanelHost>
  );
}
