'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@nb/setting/ui/ModuleSettingsPage';
import { TENANT_INVITATION_SETTINGS_FIELDS } from '@nb/tenant_invitation/server/tenant_invitation.settings.fields';

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
