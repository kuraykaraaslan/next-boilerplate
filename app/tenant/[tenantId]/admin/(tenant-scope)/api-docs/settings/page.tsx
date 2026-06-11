'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@/modules_next/setting/ui/ModuleSettingsPage';
import { API_DOC_SETTINGS_FIELDS } from '@/modules/api_doc/api_doc.settings.fields';

export default function ApiDocsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="API Documentation"
      subtitle="Visibility of this tenant's API documentation"
      parentCrumb={{ label: 'API Docs', href: `/tenant/${tenantId}/admin/api-docs` }}
      fields={API_DOC_SETTINGS_FIELDS}
    />
  );
}
