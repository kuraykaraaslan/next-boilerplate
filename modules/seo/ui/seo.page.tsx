'use client';
import { PageHeader } from '@kuraykaraaslan/common/ui/page-header.component';

// Placeholder admin surface for the polymorphic SEO module. SEO metadata is
// edited inline per-entity via seo-panel.component; this overview is scaffolded
// and will grow a tenant-wide SEO dashboard (sitemap, coverage, web-vitals).
export default function SeoPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="SEO" subtitle="Scaffolded — coming soon" />
      <p className="text-text-secondary">
        Tenant-wide SEO overview is scaffolded. Per-entity SEO metadata is edited
        from each record&apos;s SEO panel today.
      </p>
    </div>
  );
}
