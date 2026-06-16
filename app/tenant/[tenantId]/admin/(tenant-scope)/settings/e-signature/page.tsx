'use client';
import { use } from 'react';
import { Breadcrumb } from '@nb/common/ui/Breadcrumb';
import { PageHeader } from '@nb/common/ui/PageHeader';
import { TenantESignatureSettingsPanel } from '@nb/e_signature/ui/TenantESignatureSettingsPanel';

export default function ESignatureSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Settings', href: `/tenant/${tenantId}/admin/settings` }, { label: 'E-Signature' }]} />
      <PageHeader title="E-Signature" subtitle="E-signature provider configuration for this organization" />
      <TenantESignatureSettingsPanel tenantId={tenantId} />
    </div>
  );
}
