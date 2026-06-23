'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { SupplierCategoriesPanel } from '@kuraykaraaslan/supplier/ui/supplier-categories-panel.component';

export default function SupplierSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    { id: 'categories', label: 'Categories', content: <SupplierCategoriesPanel tenantId={tenantId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Suppliers', href: `/tenant/${tenantId}/admin/suppliers` },
        { label: 'Settings' },
      ]} />

      <PageHeader title="Settings" subtitle="Supplier configuration" />

      <TabGroup tabs={tabs} />
    </div>
  );
}
