'use client';
import { use } from 'react';
import { Breadcrumb } from '@nb/common/ui/breadcrumb.component';
import { PageHeader } from '@nb/common/ui/page-header.component';
import { PlatformScimTab } from '@nb/setting/ui/platform-settings-tabs.component';

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
