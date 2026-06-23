'use client';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';

// Placeholder admin surface for Order Fulfillment, surfaced in the ERP
// workspace. Scaffolded — the packing/shipment-tracking UI is coming soon.
export default function FulfillmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Fulfillment" subtitle="Scaffolded — coming soon" />
      <p className="text-text-secondary">
        Fulfillment and shipment tracking UI is scaffolded. Functionality is
        coming soon.
      </p>
    </div>
  );
}
