'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { MetersPanel } from '@kuraykaraaslan/metering/ui/meters-panel.component';

export default function MeteringSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    { id: 'meters', label: 'Meters', content: <MetersPanel tenantId={tenantId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Metering', href: `/tenant/${tenantId}/admin/metering` },
        { label: 'Settings' },
      ]} />

      <PageHeader title="Settings" subtitle="Configure metering master data" />

      <TabGroup tabs={tabs} />
    </div>
  );
}
