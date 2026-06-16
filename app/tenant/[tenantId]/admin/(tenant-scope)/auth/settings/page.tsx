'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@nb/setting/ui/module-settings-page.component';
import { AUTH_SETTINGS_FIELDS } from '@nb/auth/server/auth.settings.fields';

export default function AuthSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Authentication"
      subtitle="Registration, verification, OTP, MFA, and compliance controls"
      parentCrumb={{ label: 'Admin', href: `/tenant/${tenantId}/admin` }}
      fields={AUTH_SETTINGS_FIELDS}
    />
  );
}
