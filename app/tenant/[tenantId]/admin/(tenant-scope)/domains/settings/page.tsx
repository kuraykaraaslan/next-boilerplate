'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@nb/setting/ui/ModuleSettingsPage';
import { TENANT_DOMAIN_SETTINGS_FIELDS } from '@nb/tenant_domain/server/tenant_domain.settings.fields';

export default function DomainsSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <ModuleSettingsPage
      tenantId={tenantId}
      title="Domains"
      subtitle="Limits for custom domains and subdomains"
      parentCrumb={{ label: 'Domains', href: `/tenant/${tenantId}/admin/domains` }}
      fields={TENANT_DOMAIN_SETTINGS_FIELDS}
    />
  );
}
