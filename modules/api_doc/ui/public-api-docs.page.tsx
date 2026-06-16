'use client';
import { ApiDocsPage } from '@nb/api_doc/ui/api-docs-page.component';
import { TENANT_SPEC } from '@nb/api_doc/ui/mockSpec';

// Public tenant API docs, served by the tenant-root catch-all (title is set by
// its generateMetadata). Client so it can be lazy-loaded via the component map.
export default function PublicApiDocsPage() {
  return <ApiDocsPage spec={TENANT_SPEC} />;
}
