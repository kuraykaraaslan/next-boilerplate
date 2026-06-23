'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { UomsPanel } from './uoms-panel.component';
import { MovementReasonsPanel } from './movement-reasons-panel.component';

export default function InventorySettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    { id: 'uoms', label: 'Units of Measure', content: <UomsPanel tenantId={tenantId} /> },
    { id: 'reasons', label: 'Movement Reasons', content: <MovementReasonsPanel tenantId={tenantId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Inventory', href: `/tenant/${tenantId}/admin/inventory/warehouses` },
        { label: 'Settings' },
      ]} />

      <PageHeader
        title="Settings"
        subtitle="Configure inventory master data"
      />

      <TabGroup tabs={tabs} />
    </div>
  );
}
