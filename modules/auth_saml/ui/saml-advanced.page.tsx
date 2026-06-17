'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import { AUTH_SAML_SETTINGS_FIELDS } from '@kuraykaraaslan/auth_saml/server/auth_saml.settings.fields';

/**
 * SAML operational/safety settings (monitoring, replay detection, metadata
 * import, SLO) — distinct from the IdP/SP protocol config edited on
 * `/saml/settings` (the SamlConfigForm).
 */
export default function SamlAdvancedSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="SAML Advanced Settings"
      subtitle="Monitoring, replay protection, metadata import and Single Logout"
      parentCrumb={{ label: 'SAML SSO', href: `/tenant/${tenantId}/admin/saml` }}
      fields={AUTH_SAML_SETTINGS_FIELDS}
    />
  );
}
