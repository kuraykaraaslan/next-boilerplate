'use client';
import { use } from 'react';
import { ReviewPage } from '@kuraykaraaslan/marketplace/ui/review-page.component';

export default function AdminMarketplaceReviewPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <ReviewPage tenantId={tenantId} />;
}
