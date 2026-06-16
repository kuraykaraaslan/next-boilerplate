'use client';
import { use } from 'react';
import { SettingsPanelHost } from '@nb/setting/ui/SettingsPanelHost';
import { PlatformStorageTab } from '@nb/setting/ui/PlatformSettingsTabs';

export default function StorageSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <SettingsPanelHost
      tenantId={tenantId}
      title="Storage"
      subtitle="Object storage provider configuration (S3, R2, MinIO)"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
    >
      {(p) => <PlatformStorageTab {...p} />}
    </SettingsPanelHost>
  );
}
