'use client';
import { use } from 'react';
import { MarketplacePage } from '@kuraykaraaslan/marketplace/ui/marketplace-page.component';

export default function AdminMarketplacePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  // Single "Plugins" entry → lands on Installed; the Marketplace tab is one click away.
  return <MarketplacePage tenantId={tenantId} defaultTab="installed" />;
}
