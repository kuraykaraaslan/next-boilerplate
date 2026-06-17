'use client';
import { use } from 'react';
import { MarketplacePage } from '@kuraykaraaslan/marketplace/ui/marketplace-page.component';

export default function AdminMarketplacePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <MarketplacePage tenantId={tenantId} />;
}
