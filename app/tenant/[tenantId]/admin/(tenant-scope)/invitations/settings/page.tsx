'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@/modules_next/setting/ui/ModuleSettingsPage';
import { TENANT_INVITATION_SETTINGS_FIELDS } from '@/modules/tenant_invitation/tenant_invitation.settings.fields';

export default function InvitationsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Invitations"
      subtitle="Caching behavior for invitation lookups"
      parentCrumb={{ label: 'Invitations', href: `/tenant/${tenantId}/admin/invitations` }}
      fields={TENANT_INVITATION_SETTINGS_FIELDS}
    />
  );
}
