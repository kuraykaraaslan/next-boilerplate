'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { ReturnReasonsPanel } from '@kuraykaraaslan/payment_return_rma/ui/return-reasons-panel.component';

export default function ReturnSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    { id: 'reasons', label: 'Return Reasons', content: <ReturnReasonsPanel tenantId={tenantId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Returns', href: `/tenant/${tenantId}/admin/returns` },
        { label: 'Settings' },
      ]} />

      <PageHeader title="Settings" subtitle="Configure return master data" />

      <TabGroup tabs={tabs} />
    </div>
  );
}
