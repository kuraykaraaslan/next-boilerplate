'use client';
import { use } from 'react';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';
import { Breadcrumb } from '@kuraykaraaslan/common/ui/breadcrumb.component';
import { TabGroup } from '@kuraykaraaslan/common/ui/tab-group.component';
import { ProductTagsPanel } from '@kuraykaraaslan/store/ui/product-tags-panel.component';

export default function StoreSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);

  const tabs = [
    { id: 'product-tags', label: 'Product Tags', content: <ProductTagsPanel tenantId={tenantId} /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Store', href: `/tenant/${tenantId}/admin/store/products` },
        { label: 'Settings' },
      ]} />

      <PageHeader title="Settings" subtitle="Configure store master data" />

      <TabGroup tabs={tabs} />
    </div>
  );
}
