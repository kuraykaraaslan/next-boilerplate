'use client';
import { use } from 'react';
import { DeveloperListingDetail } from '@kuraykaraaslan/marketplace/ui/developer-listing-detail.component';

export default function AdminDeveloperListingDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string; listingId: string }>;
}) {
  const { tenantId, listingId } = use(params);
  return <DeveloperListingDetail tenantId={tenantId} listingId={listingId} />;
}
