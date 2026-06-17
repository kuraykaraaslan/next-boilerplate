'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import { TENANT_MEMBER_SETTINGS_FIELDS } from '@kuraykaraaslan/tenant_member/server/tenant_member.settings.fields';

export default function MembersSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Members"
      subtitle="Configure roles and membership behavior"
      parentCrumb={{ label: 'Members', href: `/tenant/${tenantId}/admin/members` }}
      fields={TENANT_MEMBER_SETTINGS_FIELDS}
    />
  );
}
