'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@/modules_next/setting/ui/ModuleSettingsPage';
import { API_KEY_SETTINGS_FIELDS } from '@/modules/api_key/api_key.settings.fields';

export default function ApiKeysSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="API Keys"
      subtitle="Caching behavior for API key lookups"
      parentCrumb={{ label: 'API Keys', href: `/tenant/${tenantId}/admin/api-keys` }}
      fields={API_KEY_SETTINGS_FIELDS}
    />
  );
}
