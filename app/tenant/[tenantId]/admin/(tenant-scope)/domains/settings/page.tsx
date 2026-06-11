'use client';
import { use } from 'react';
import { ModuleSettingsPage } from '@/modules_next/setting/ui/ModuleSettingsPage';
import { TENANT_DOMAIN_SETTINGS_FIELDS } from '@/modules/tenant_domain/tenant_domain.settings.fields';

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
