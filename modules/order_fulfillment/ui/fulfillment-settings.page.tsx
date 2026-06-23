'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { CarriersPanel } from '@kuraykaraaslan/order_fulfillment/ui/carriers-panel.component';

export default function FulfillmentSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    { id: 'carriers', label: 'Carriers', content: <CarriersPanel tenantId={tenantId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Fulfillment', href: `/tenant/${tenantId}/admin/fulfillment` },
        { label: 'Settings' },
      ]} />

      <PageHeader title="Settings" subtitle="Configure fulfillment master data" />

      <TabGroup tabs={tabs} />
    </div>
  );
}
