'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@kuraykaraaslan/setting/ui/module-settings-page.component';
import { API_DOC_SETTINGS_FIELDS } from '@kuraykaraaslan/api_doc/server/api_doc.settings.fields';

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
