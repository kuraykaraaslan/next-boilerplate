'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { SalaryComponentsPanel } from './salary-components-panel.component';

export default function PayrollSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    {
      id: 'salary-components',
      label: 'Salary Components',
      content: <SalaryComponentsPanel tenantId={tenantId} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Payroll', href: `/tenant/${tenantId}/admin/payroll/runs` },
        { label: 'Settings' },
      ]} />

      <PageHeader title="Settings" subtitle="Configure payroll master-data." />

      <TabGroup tabs={tabs} />
    </div>
  );
}
