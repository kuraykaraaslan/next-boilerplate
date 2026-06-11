'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@/modules_next/setting/ui/ModuleSettingsPage';
import { IMPERSONATION_SETTINGS_FIELDS } from '@/modules/auth_impersonation/impersonation.settings.fields';

export default function ImpersonationSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Impersonation"
      subtitle="Control how admins may impersonate this tenant's users"
      parentCrumb={{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }}
      fields={IMPERSONATION_SETTINGS_FIELDS}
    />
  );
}
