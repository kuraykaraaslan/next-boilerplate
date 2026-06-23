'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import { REDIRECT_SETTINGS_FIELDS } from '@kuraykaraaslan/redirect/server/redirect.settings.fields';

export default function RedirectSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Redirect Settings"
      subtitle="Default behavior for URL redirects"
      parentCrumb={{ label: 'Redirects', href: `/tenant/${tenantId}/admin/redirects` }}
      fields={REDIRECT_SETTINGS_FIELDS}
    />
  );
}
