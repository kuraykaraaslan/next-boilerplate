'use client';
import { use } from 'react';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { TenantESignatureSettingsPanel } from '@kuraykaraaslan/e_signature/ui/tenant-e-signature-settings-panel.component';

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
