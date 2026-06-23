'use client';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';

// Placeholder admin surface for the Media Library. Galleries are attached
// per-entity via gallery-panel.component; this central library view is
// scaffolded and will grow tenant-wide media browsing/search.
export default function MediaLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Media Library" subtitle="Scaffolded — coming soon" />
      <p className="text-text-secondary">
        Central media library is scaffolded. Galleries are attached to records
        from each entity&apos;s gallery panel today.
      </p>
    </div>
  );
}
