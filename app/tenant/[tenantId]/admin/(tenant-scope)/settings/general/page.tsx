'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@/modules_next/setting/ui/SettingsPanelHost';
import { GeneralTab } from '@/modules_next/setting/ui/TenantSettingsPanels';

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
