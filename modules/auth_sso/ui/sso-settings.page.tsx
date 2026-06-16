'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@nb/setting/ui/module-settings-page.component';
import { AUTH_SSO_SETTINGS_FIELDS } from '@nb/auth_sso/server/auth_sso.settings.fields';

export default function SsoSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Social Login (SSO)"
      subtitle="Per-tenant OAuth provider gating, consent and security policy"
      parentCrumb={{ label: 'Admin', href: `/tenant/${tenantId}/admin` }}
      fields={AUTH_SSO_SETTINGS_FIELDS}
    />
  );
}
