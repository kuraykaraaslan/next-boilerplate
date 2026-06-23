'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import { NAVIGATION_SETTINGS_FIELDS } from '@kuraykaraaslan/navigation/server/navigation.settings.fields';

export default function NavigationSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Navigation Settings"
      subtitle="Defaults and rendering behavior for site menus"
      parentCrumb={{ label: 'Navigation', href: `/tenant/${tenantId}/admin/navigation` }}
      fields={NAVIGATION_SETTINGS_FIELDS}
    />
  );
}
