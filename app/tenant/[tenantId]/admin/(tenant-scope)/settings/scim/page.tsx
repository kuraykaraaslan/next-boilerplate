'use client';
import { use } from 'react';
import { Breadcrumb } from '@/modules_next/common/ui/Breadcrumb';
import { PageHeader } from '@/modules_next/common/ui/PageHeader';
import { PlatformScimTab } from '@/modules_next/setting/ui/PlatformSettingsTabs';

export default function ScimSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }, { label: 'SCIM Provisioning' }]} />
      <PageHeader title="SCIM Provisioning" subtitle="SCIM 2.0 endpoint and provisioning tokens for your IdP" />
      <PlatformScimTab tenantId={tenantId} />
    </div>
  );
}
