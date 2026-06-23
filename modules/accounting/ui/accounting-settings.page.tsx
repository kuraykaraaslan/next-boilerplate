'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { JournalsPanel } from '@kuraykaraaslan/accounting/ui/journals-panel.component';

export default function AccountingSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    { id: 'journals', label: 'Journals', content: <JournalsPanel tenantId={tenantId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Accounting', href: `/tenant/${tenantId}/admin/accounting/accounts` },
        { label: 'Settings' },
      ]} />

      <PageHeader title="Settings" subtitle="Configure accounting master data" />

      <TabGroup tabs={tabs} />
    </div>
  );
}
