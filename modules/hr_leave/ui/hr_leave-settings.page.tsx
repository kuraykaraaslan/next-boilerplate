'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { LeaveTypesPanel } from '@kuraykaraaslan/hr_leave/ui/leave-types-panel.component';

export default function HrLeaveSettingsConfigPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    { id: 'leave-types', label: 'Leave Types', content: <LeaveTypesPanel tenantId={tenantId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Leave', href: `/tenant/${tenantId}/admin/hr/leave` },
        { label: 'Settings' },
      ]} />

      <PageHeader title="Leave Settings" subtitle="Configure leave master data" />

      <TabGroup tabs={tabs} />
    </div>
  );
}
