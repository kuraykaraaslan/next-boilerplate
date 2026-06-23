'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { LeaveTypesPanel } from '@kuraykaraaslan/hr/ui/leave-types-panel.component';

export default function HrSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    { id: 'leave-types', label: 'Leave Types', content: <LeaveTypesPanel tenantId={tenantId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'HR', href: `/tenant/${tenantId}/admin/hr/employees` },
        { label: 'Settings' },
      ]} />

      <PageHeader title="Settings" subtitle="Configure HR master data" />

      <TabGroup tabs={tabs} />
    </div>
  );
}
