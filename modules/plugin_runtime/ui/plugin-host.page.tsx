'use client';
import { use } from 'react';
import { PluginFrame } from '@kuraykaraaslan/plugin_runtime/ui/plugin-frame.component';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';

/** Admin host page for a single community plugin's sandboxed UI. */
export default function PluginHostPage({
  params,
}: {
  params: Promise<{ tenantId: string; listingId: string }>;
}) {
  const { tenantId, listingId } = use(params);
  return (
    <div className="space-y-4">
      <PageHeader title="Plugin" subtitle="Runs in a sandboxed frame on a separate origin" />
      <PluginFrame tenantId={tenantId} listingId={listingId} />
    </div>
  );
}
